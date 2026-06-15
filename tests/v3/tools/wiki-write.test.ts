import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { wikiWrite } from '../../../src/v3/tools/wiki-write';
import { WikiWriteInput } from '../../../src/v3/tools/types';

describe('wiki-write', () => {
  let tempDir: string;

  const makeInput = (overrides: Partial<WikiWriteInput> = {}): WikiWriteInput => ({
    projectPath: tempDir,
    entities: [{
      canonical: 'John Doe',
      type: 'Person',
      content: 'Test content',
      sources: [{ file: 'raw/test.md', lines: [1] }],
      isUpdate: false,
    }],
    ...overrides,
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
    await fs.mkdir(path.join(tempDir, 'wiki'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'ontology.yaml'),
      'version: "1.0"\nentity_types:\n  Person:\n    description: 人物\n  Event:\n    description: 事件\n'
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // ============ 创建 ============

  it('should create new wiki page', async () => {
    const result = await wikiWrite(makeInput());
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].action).toBe('created');

    const content = await fs.readFile(result.results[0].path!, 'utf-8');
    expect(content).toContain('canonical: John Doe');
    expect(content).toContain('entity_type: Person');
  });

  it('should create page with multi-byte canonical name', async () => {
    const result = await wikiWrite({
      projectPath: tempDir,
      entities: [{
        canonical: 'Beyoncé',
        type: 'Person',
        content: 'Singer',
        sources: [{ file: 'raw/test.md' }],
        isUpdate: false,
      }],
    });
    expect(result.results[0].success).toBe(true);
    // 文件名应保留 é 字符
    const content = await fs.readFile(result.results[0].path!, 'utf-8');
    expect(content).toContain('canonical: Beyoncé');
  });

  it('should fail if file exists on create', async () => {
    // 手动创建文件使创建失败
    const personsDir = path.join(tempDir, 'wiki', 'Person');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(path.join(personsDir, 'John_Doe.md'), 'existing');

    const result = await wikiWrite(makeInput());
    expect(result.results[0].success).toBe(false);
    expect(result.results[0].error).toContain('无法创建');
  });

  // ============ 更新 ============

  it('should update existing page', async () => {
    const personsDir = path.join(tempDir, 'wiki', 'Person');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(
      path.join(personsDir, 'John_Doe.md'),
      '---\ncanonical: John Doe\nentity_type: Person\nsources: []\n---\n# John Doe\n\nOriginal.'
    );

    const result = await wikiWrite({
      projectPath: tempDir,
      entities: [{
        canonical: 'John Doe',
        type: 'Person',
        content: 'Updated content',
        sources: [{ file: 'raw/test.md', lines: [1] }],
        isUpdate: true,
      }],
    });
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].action).toBe('updated');

    const content = await fs.readFile(result.results[0].path!, 'utf-8');
    expect(content).toContain('Original.');
    expect(content).toContain('Updated content');
  });

  it('should fail update if file does not exist', async () => {
    const result = await wikiWrite({
      projectPath: tempDir,
      entities: [{
        canonical: 'John Doe',
        type: 'Person',
        content: 'Updated',
        sources: [{ file: 'raw/test.md', lines: [1] }],
        isUpdate: true,
      }],
    });
    expect(result.results[0].success).toBe(false);
    expect(result.results[0].error).toContain('无法更新');
  });

  it('should merge aliases on update', async () => {
    const personsDir = path.join(tempDir, 'wiki', 'Person');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(
      path.join(personsDir, 'John_Doe.md'),
      '---\ncanonical: John Doe\nentity_type: Person\naliases:\n  - Johnny\nsources: []\n---\n# John Doe'
    );

    const result = await wikiWrite({
      projectPath: tempDir,
      entities: [{
        canonical: 'John Doe',
        type: 'Person',
        aliases: ['John', 'Mr. Doe'],
        content: 'Updated',
        sources: [{ file: 'raw/test.md', lines: [1] }],
        isUpdate: true,
      }],
    });
    const content = await fs.readFile(result.results[0].path!, 'utf-8');
    expect(content).toContain('Johnny');
    expect(content).toContain('John');
    expect(content).toContain('Mr. Doe');
  });

  // ============ 错误处理 ============

  it('should fail for unknown entity type', async () => {
    const result = await wikiWrite({
      projectPath: tempDir,
      entities: [{
        canonical: 'Test',
        type: 'Unknown',
        content: 'Test',
        sources: [{ file: 'raw/test.md', lines: [1] }],
        isUpdate: false,
      }],
    });
    expect(result.results[0].success).toBe(false);
    expect(result.results[0].error).toContain('未知实体类型');
  });
});
