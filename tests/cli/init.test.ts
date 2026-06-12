import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('cli init', () => {
  const testDir = path.join(__dirname, 'test-init');
  const cliPath = path.join(__dirname, '../../src/cli.ts');

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('应该创建标准目录结构', async () => {
    execSync(`npx ts-node ${cliPath} init ${testDir}`, { encoding: 'utf-8' });

    // 检查目录
    const rawStat = await fs.stat(path.join(testDir, 'raw'));
    const wikiStat = await fs.stat(path.join(testDir, 'wiki'));
    const ontomarkStat = await fs.stat(path.join(testDir, '.ontomark'));
    const cacheStat = await fs.stat(path.join(testDir, '.ontomark', 'cache'));

    expect(rawStat.isDirectory()).toBe(true);
    expect(wikiStat.isDirectory()).toBe(true);
    expect(ontomarkStat.isDirectory()).toBe(true);
    expect(cacheStat.isDirectory()).toBe(true);

    // 检查文件
    const ontologyStat = await fs.stat(path.join(testDir, 'ontology.yaml'));
    const claudeStat = await fs.stat(path.join(testDir, 'CLAUDE.md'));
    const agentsStat = await fs.stat(path.join(testDir, 'AGENTS.md'));

    expect(ontologyStat.isFile()).toBe(true);
    expect(claudeStat.isFile()).toBe(true);
    expect(agentsStat.isFile()).toBe(true);
  });

  it('应该创建有效的 ontology.yaml 文件', async () => {
    execSync(`npx ts-node ${cliPath} init ${testDir}`, { encoding: 'utf-8' });

    const ontologyContent = await fs.readFile(path.join(testDir, 'ontology.yaml'), 'utf-8');

    // 验证基本结构
    expect(ontologyContent).toContain('entities:');
    expect(ontologyContent).toContain('- name:');
  });

  it('应该拒绝覆盖已存在的目录（无 --force）', async () => {
    // 先创建目录和 ontology.yaml（表示已初始化）
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(path.join(testDir, 'ontology.yaml'), 'existing');

    // 尝试初始化应该失败
    expect(() => {
      execSync(`npx ts-node ${cliPath} init ${testDir}`, { encoding: 'utf-8' });
    }).toThrow();
  });

  it('应该允许使用 --force 强制覆盖', async () => {
    // 先创建目录和文件
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(path.join(testDir, 'test.txt'), 'existing');

    // 使用 --force 初始化
    execSync(`npx ts-node ${cliPath} init ${testDir} --force`, { encoding: 'utf-8' });

    // 检查标准结构
    expect(await fs.stat(path.join(testDir, 'raw'))).toBeDefined();
    expect(await fs.stat(path.join(testDir, 'wiki'))).toBeDefined();
    expect(await fs.stat(path.join(testDir, 'ontology.yaml'))).toBeDefined();
  });

  it('应该在当前目录初始化（无参数）', async () => {
    // 创建临时测试目录
    await fs.mkdir(testDir, { recursive: true });

    execSync(`npx ts-node ${cliPath} init`, {
      encoding: 'utf-8',
      cwd: testDir,
    });

    // 检查当前目录下创建的结构
    expect(await fs.stat(path.join(testDir, 'raw'))).toBeDefined();
    expect(await fs.stat(path.join(testDir, 'wiki'))).toBeDefined();
    expect(await fs.stat(path.join(testDir, 'ontology.yaml'))).toBeDefined();
  });
});
