import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { pendingFiles } from '../../../src/v3/tools/pending-files';

describe('pending-files', () => {
  let tempDir: string;

  function git(args: string): string {
    return execSync(`git ${args}`, { cwd: tempDir, encoding: 'utf-8' }).trim();
  }

  async function writeFile(relPath: string, content: string): Promise<void> {
    const dir = path.dirname(path.join(tempDir, relPath));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(tempDir, relPath), content, 'utf-8');
  }

  function gitCommitAll(msg: string): void {
    git('add -A');
    git(`commit -m "${msg}"`);
  }

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
    await fs.mkdir(path.join(tempDir, 'raw'), { recursive: true });
    await fs.mkdir(path.join(tempDir, '.ontomark'), { recursive: true });
    git('init');
    git('config user.email test@ontomark.dev');
    git('config user.name Tester');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // ============ 测试用例 ============

  it('should return all files on first run (no lastHash)', async () => {
    await writeFile('raw/a.md', 'content a');
    await writeFile('raw/sub/b.md', 'content b');
    await writeFile('raw/ignore.txt', 'ignored');
    gitCommitAll('first commit');

    const result = await pendingFiles(tempDir);

    expect(result.total).toBe(2);
    expect(result.files).toContain('raw/a.md');
    expect(result.files).toContain('raw/sub/b.md');
    expect(result.files).not.toContain('raw/ignore.txt');
    expect(result.lastHash).toBeTruthy();
  });

  it('should return empty when no new commits', async () => {
    await writeFile('raw/a.md', 'content a');
    gitCommitAll('first commit');

    const headHash = git('rev-parse HEAD');
    await writeFile('.ontomark/processed.json', JSON.stringify({ lastProcessedHash: headHash }));

    const result = await pendingFiles(tempDir);

    expect(result.total).toBe(0);
    expect(result.files).toEqual([]);
  });

  it('should detect new raw files after a commit', async () => {
    await writeFile('raw/a.md', 'content a');
    gitCommitAll('first commit');

    const headHash = git('rev-parse HEAD');
    await writeFile('.ontomark/processed.json', JSON.stringify({ lastProcessedHash: headHash }));

    await writeFile('raw/b.md', 'content b');
    gitCommitAll('second commit');

    const result = await pendingFiles(tempDir);

    expect(result.total).toBe(1);
    expect(result.files).toEqual(['raw/b.md']);
  });

  it('should detect modified raw files', async () => {
    await writeFile('raw/a.md', 'content a');
    gitCommitAll('first commit');

    const headHash = git('rev-parse HEAD');
    await writeFile('.ontomark/processed.json', JSON.stringify({ lastProcessedHash: headHash }));

    await writeFile('raw/a.md', 'modified content a');
    gitCommitAll('second commit');

    const result = await pendingFiles(tempDir);

    expect(result.total).toBe(1);
    expect(result.files).toEqual(['raw/a.md']);
  });

  it('should not detect other authors commits', async () => {
    await writeFile('raw/a.md', 'content a');
    gitCommitAll('first commit');

    const headHash = git('rev-parse HEAD');
    await writeFile('.ontomark/processed.json', JSON.stringify({ lastProcessedHash: headHash }));

    // 用另一个 email 提交
    await writeFile('raw/b.md', 'content b');
    git('config user.email other@ontomark.dev');
    git('config user.name Other');
    gitCommitAll('second commit by other');

    // 恢复当前用户的 email，以便 pendingFiles 读取
    git('config user.email test@ontomark.dev');
    git('config user.name Tester');

    const result = await pendingFiles(tempDir);

    expect(result.total).toBe(0);
    expect(result.files).toEqual([]);
  });

  it('should throw error on invalid lastHash (rebase scenario)', async () => {
    await writeFile('raw/a.md', 'content a');
    gitCommitAll('first commit');

    await writeFile('.ontomark/processed.json', JSON.stringify({ lastProcessedHash: '0000000000000000000000000000000000000000' }));

    await expect(pendingFiles(tempDir)).rejects.toThrow('lastProcessedHash');
  });

  it('should throw error when not in git repo', async () => {
    // 删除 .git 目录
    await fs.rm(path.join(tempDir, '.git'), { recursive: true, force: true });

    await expect(pendingFiles(tempDir)).rejects.toThrow('git 仓库');
  });
});
