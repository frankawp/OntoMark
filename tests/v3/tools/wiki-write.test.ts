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
      name: 'John Doe',
      type: 'Person',
      content: 'Test content',
      sources: [{ file: 'raw/test.md', lines: [1] }],
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

  // ============ 写入 ============

  it('should create new wiki page', async () => {
    const result = await wikiWrite(makeInput());
    expect(result.results[0].success).toBe(true);

    const content = await fs.readFile(result.results[0].path!, 'utf-8');
    expect(content).toContain('name: John Doe');
    expect(content).toContain('type: Person');
  });

  it('should create page with multi-byte name name', async () => {
    const result = await wikiWrite({
      projectPath: tempDir,
      entities: [{
        name: 'Beyoncé',
        type: 'Person',
        content: 'Singer',
        sources: [{ file: 'raw/test.md' }],
      }],
    });
    expect(result.results[0].success).toBe(true);
    // 文件名应保留 é 字符
    const content = await fs.readFile(result.results[0].path!, 'utf-8');
    expect(content).toContain('name: Beyoncé');
  });

  it('should overwrite existing page', async () => {
    // 先创建文件
    const personsDir = path.join(tempDir, 'wiki', 'Person');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(
      path.join(personsDir, 'John_Doe.md'),
      '---\nname: John Doe\nentity_type: Person\nsources: []\n---\n# John Doe\n\nOriginal.'
    );

    // 再次写入覆盖
    const result = await wikiWrite(makeInput());
    expect(result.results[0].success).toBe(true);

    const content = await fs.readFile(result.results[0].path!, 'utf-8');
    expect(content).toContain('Test content');
    expect(content).not.toContain('Original.');
  });

  it('should write with aliases', async () => {
    const result = await wikiWrite({
      projectPath: tempDir,
      entities: [{
        name: 'John Doe',
        type: 'Person',
        aliases: ['Johnny', 'Mr. Doe'],
        content: 'Test',
        sources: [{ file: 'raw/test.md' }],
      }],
    });
    const content = await fs.readFile(result.results[0].path!, 'utf-8');
    expect(content).toContain('Johnny');
    expect(content).toContain('Mr. Doe');
  });


  // ============ 错误处理 ============

  it('should fail for unknown entity type', async () => {
    const result = await wikiWrite({
      projectPath: tempDir,
      entities: [{
        name: 'Test',
        type: 'Unknown',
        content: 'Test',
        sources: [{ file: 'raw/test.md', lines: [1] }],
      }],
    });
    expect(result.results[0].success).toBe(false);
    expect(result.results[0].error).toContain('未知实体类型');
  });

  it('should return failed count', async () => {
    const result = await wikiWrite({
      projectPath: tempDir,
      entities: [
        { name: 'Good', type: 'Person', content: 'Test', sources: [{ file: 'raw/test.md' }] },
        { name: 'Bad', type: 'Unknown', content: 'Test', sources: [{ file: 'raw/test.md' }] },
      ],
    });
    expect(result.total).toBe(2);
    expect(result.failed).toBe(1);
  });
});
