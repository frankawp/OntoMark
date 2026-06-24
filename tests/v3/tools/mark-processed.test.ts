import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';
import { markProcessed } from '../../../src/v3/tools/mark-processed';

describe('mark-processed', () => {
  let tempDir: string;
  let ontomarkDir: string;

  function git(args: string[]): void {
    const result = spawnSync('git', args, { cwd: tempDir, encoding: 'utf-8' });
    if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  }

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
    ontomarkDir = path.join(tempDir, '.ontomark');
    await fs.mkdir(ontomarkDir, { recursive: true });

    // 初始化 git 仓库并做初始 commit
    git(['init']);
    git(['config', 'user.email', 'test@ontomark.dev']);
    git(['config', 'user.name', 'Tester']);
    await fs.writeFile(path.join(tempDir, 'README.md'), '# test', 'utf-8');
    git(['add', '-A']);
    git(['commit', '-m', 'init']);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should create processed.json with HEAD hash', async () => {
    await markProcessed(tempDir);

    const content = await fs.readFile(path.join(ontomarkDir, 'processed.json'), 'utf-8');
    const data = JSON.parse(content);
    expect(data.lastProcessedHash).toBeDefined();
    expect(data.lastProcessedHash.length).toBe(40); // SHA1 hex
    expect(data.lastProcessedAt).toBeDefined();
  });

  it('should update existing processed.json', async () => {
    await markProcessed(tempDir);
    const firstData = JSON.parse(
      await fs.readFile(path.join(ontomarkDir, 'processed.json'), 'utf-8')
    );
    const firstHash = firstData.lastProcessedHash;

    // 第二个 commit
    git(['commit', '--allow-empty', '-m', 'second']);
    await markProcessed(tempDir);

    const secondData = JSON.parse(
      await fs.readFile(path.join(ontomarkDir, 'processed.json'), 'utf-8')
    );
    expect(secondData.lastProcessedHash).not.toBe(firstHash);
  });

  it('should throw error when not in git repo', async () => {
    await fs.rm(path.join(tempDir, '.git'), { recursive: true, force: true });
    await expect(markProcessed(tempDir)).rejects.toThrow();
  });
});
