import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  ontologyStatus,
  rawStatus,
  wikiStatus,
  markProcessed,
  wikiWrite,
  indexBuild,
  indexQuery,
  lintAll,
} from '../../src/v3';

describe('V3 Integration', () => {
  let tempDir: string;
  let rawDir: string;
  let wikiDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
    rawDir = path.join(tempDir, 'raw');
    wikiDir = path.join(tempDir, 'wiki');
    await fs.mkdir(rawDir, { recursive: true });
    await fs.mkdir(wikiDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should complete full workflow', async () => {
    // 1. 创建 ontology
    await fs.writeFile(
      path.join(tempDir, 'ontology.yaml'),
      `version: "1.0"
entity_types:
  Person:
    description: 人物
`
    );

    const ontology = await ontologyStatus(tempDir);
    expect(ontology.exists).toBe(true);

    // 2. 添加 raw 文件
    await fs.writeFile(path.join(rawDir, 'test.md'), '# Test Document\n\nContent about John Doe.');

    const raw = await rawStatus(tempDir);
    expect(raw.total).toBe(1);
    expect(raw.pending).toBe(1);

    // 3. 写入 wiki
    const writeResult = await wikiWrite({
      projectPath: tempDir,
      entities: [{
        canonical: 'John Doe',
        type: 'Person',
        content: 'Test content',
        sources: [{ file: 'raw/test.md', lines: [1] }],
        isUpdate: false,
      }],
    });
    expect(writeResult.results[0].success).toBe(true);

    // 4. 标记已处理
    await markProcessed(tempDir, 'raw/test.md');

    const rawAfter = await rawStatus(tempDir);
    expect(rawAfter.pending).toBe(0);

    // 5. 构建索引
    await indexBuild(tempDir);

    // 6. 查询索引
    const query = await indexQuery(tempDir, 'John Doe');
    expect(query.found).toBe(true);

    // 7. 检查 wiki 状态
    const wiki = await wikiStatus(tempDir);
    expect(wiki.total).toBe(1);

    // 8. Lint 检查
    const lint = await lintAll(tempDir);
    expect(lint.totalIssues).toBeGreaterThanOrEqual(0);
  });
});
