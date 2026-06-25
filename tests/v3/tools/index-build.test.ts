/**
 * index-build 工具测试
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { indexBuild } from '../../../src/v3/tools/index-build';

describe('index-build', () => {
  let tempDir: string;
  let wikiDir: string;
  let ontomarkDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
    wikiDir = path.join(tempDir, 'wiki');
    ontomarkDir = path.join(tempDir, '.ontomark');
    await fs.mkdir(wikiDir, { recursive: true });
    await fs.mkdir(ontomarkDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should create index from wiki files', async () => {
    const personsDir = path.join(wikiDir, 'Persons');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(
      path.join(personsDir, 'John_Doe.md'),
      '---\ncanonical: John Doe\nentity_type: Person\naliases:\n  - Johnny\n  - JD\n---\n# John Doe'
    );
    await fs.writeFile(
      path.join(personsDir, 'Jane_Doe.md'),
      '---\ncanonical: Jane Doe\nentity_type: Person\n---\n# Jane Doe'
    );

    const result = await indexBuild(tempDir);
    expect(result.entities['John Doe']).toBeDefined();
    expect(result.entities['John Doe'].type).toBe('Person');
    expect(result.aliases['Johnny']).toBe('John Doe');
    expect(result.aliases['JD']).toBe('John Doe');
  });

  it('should save index to .ontomark/index.json', async () => {
    const personsDir = path.join(wikiDir, 'Persons');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(
      path.join(personsDir, 'Test.md'),
      '---\ncanonical: Test\nentity_type: Person\n---\n# Test'
    );

    await indexBuild(tempDir);
    const data = JSON.parse(await fs.readFile(path.join(ontomarkDir, 'index.json'), 'utf-8'));
    expect(data.entities['Test']).toBeDefined();
  });

  it('should generate index.md with grouped entity structure and footer', async () => {
    // 创建多个类型的 wiki 文件
    const personsDir = path.join(wikiDir, 'Persons');
    const orgsDir = path.join(wikiDir, 'Organizations');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.mkdir(orgsDir, { recursive: true });

    await fs.writeFile(
      path.join(personsDir, 'Alice.md'),
      '---\ncanonical: Alice\nentity_type: Person\ndescription: A test person\n---\n# Alice\nSome content.'
    );
    await fs.writeFile(
      path.join(personsDir, 'Bob.md'),
      '---\ncanonical: Bob\nentity_type: Person\ndescription: Another person\n---\n# Bob\nMore content.'
    );
    await fs.writeFile(
      path.join(orgsDir, 'Acme_Corp.md'),
      '---\ncanonical: Acme Corp\nentity_type: Organization\ndescription: A test company\n---\n# Acme Corp\nCompany details.'
    );

    await indexBuild(tempDir);

    const indexMd = await fs.readFile(path.join(wikiDir, 'index.md'), 'utf-8');

    // 验证包含实体名
    expect(indexMd).toContain('Alice');
    expect(indexMd).toContain('Bob');
    expect(indexMd).toContain('Acme Corp');

    // 验证按类型分组（按 type 字母序：Organization < Person）
    const orgSection = indexMd.indexOf('## Organization');
    const personSection = indexMd.indexOf('## Person');
    expect(orgSection).toBeGreaterThan(-1);
    expect(personSection).toBeGreaterThan(-1);
    expect(personSection).toBeGreaterThan(orgSection);

    // 验证 _最后更新 footer 和实体计数
    expect(indexMd).toMatch(/_最后更新/u);
    expect(indexMd).toMatch(/共 3 个实体/u);
  });

  it('should handle empty wiki', async () => {
    const result = await indexBuild(tempDir);
    expect(Object.keys(result.entities)).toHaveLength(0);
    expect(Object.keys(result.aliases)).toHaveLength(0);
  });
});
