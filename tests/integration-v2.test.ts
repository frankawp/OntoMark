import * as fs from 'fs/promises';
import * as path from 'path';
import { OntoMark } from '../src/index';

describe('Integration: LLM-Wiki Architecture', () => {
  const vaultPath = path.join(__dirname, 'fixtures/multihop_vault');
  const rawPath = path.join(vaultPath, 'raw');
  const wikiPath = path.join(vaultPath, 'wiki');

  const mockProvider = {
    recognize: jest.fn().mockResolvedValue({ entities: [] }),
    extract: jest.fn().mockImplementation(async (input: any) => {
      // 模拟提取逻辑
      const content = input.content;
      const entities: any[] = [];

      if (content.includes('FTX')) {
        entities.push({
          name: 'FTX',
          aliases: [],
          type: 'Organization',
          context: ['FTX was a major cryptocurrency exchange'],
          confidence: 0.9,
        });
      }

      if (content.includes('Sam Bankman-Fried') || content.includes('SBF')) {
        entities.push({
          name: 'Sam Bankman-Fried',
          aliases: ['SBF'],
          type: 'Person',
          context: ['former CEO of FTX'],
          confidence: 0.95,
        });
      }

      if (content.includes('Caroline Ellison')) {
        entities.push({
          name: 'Caroline Ellison',
          aliases: [],
          type: 'Person',
          context: ['former CEO of Alameda Research'],
          confidence: 0.9,
        });
      }

      if (content.includes('Alameda Research')) {
        entities.push({
          name: 'Alameda Research',
          aliases: [],
          type: 'Organization',
          context: ['trading firm closely linked to FTX'],
          confidence: 0.9,
        });
      }

      return { entities };
    }),
  };

  beforeEach(async () => {
    // 清空 wiki 目录
    await fs.rm(wikiPath, { recursive: true, force: true });
    await fs.mkdir(wikiPath, { recursive: true });
  });

  it('should extract entities and create wiki pages', async () => {
    const ontomark = new OntoMark({
      rawPath,
      wikiPath,
      llmProvider: mockProvider as any,
    });

    const result = await ontomark.extract();

    expect(result.extractSuccess).toBeGreaterThan(0);
    expect(result.wikiPages).toBeGreaterThan(0);
  });

  it('should create index.md', async () => {
    const ontomark = new OntoMark({
      rawPath,
      wikiPath,
      llmProvider: mockProvider as any,
    });

    await ontomark.extract();

    const indexPath = path.join(wikiPath, 'index.md');
    const exists = await fs.access(indexPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('should run full build pipeline', async () => {
    const ontomark = new OntoMark({
      rawPath,
      wikiPath,
      llmProvider: mockProvider as any,
    });

    const result = await ontomark.build();

    expect(result.extractSuccess).toBeGreaterThan(0);
    expect(result.wikiPages).toBeGreaterThan(0);
  });

  it('should extract entities from multiple documents', async () => {
    const ontomark = new OntoMark({
      rawPath,
      wikiPath,
      llmProvider: mockProvider as any,
    });

    const result = await ontomark.extract();

    // 应该处理 2 个文档
    expect(result.extractSuccess).toBe(2);
    expect(result.extractFailed).toBe(0);

    // 应该生成多个 wiki 页面 (FTX, Sam Bankman-Fried, Caroline Ellison, Alameda Research)
    expect(result.wikiPages).toBeGreaterThanOrEqual(3);
  });

  it('should merge duplicate entities across documents', async () => {
    const ontomark = new OntoMark({
      rawPath,
      wikiPath,
      llmProvider: mockProvider as any,
    });

    const result = await ontomark.extract();

    // 检查 FTX 实体是否被正确合并
    const ftxPath = path.join(wikiPath, 'FTX.md');
    const exists = await fs.access(ftxPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    if (exists) {
      const content = await fs.readFile(ftxPath, 'utf-8');
      expect(content).toContain('FTX');
    }

    // 检查 Sam Bankman-Fried 是否被合并 (包含 SBF 别名)
    // 文件名使用下划线替换空格
    const sbfPath = path.join(wikiPath, 'Sam_Bankman-Fried.md');
    const sbfExists = await fs.access(sbfPath).then(() => true).catch(() => false);
    expect(sbfExists).toBe(true);

    if (sbfExists) {
      const content = await fs.readFile(sbfPath, 'utf-8');
      // 应该包含别名 SBF
      expect(content).toContain('SBF');
    }
  });

  it('should create wiki pages with correct structure', async () => {
    const ontomark = new OntoMark({
      rawPath,
      wikiPath,
      llmProvider: mockProvider as any,
    });

    await ontomark.extract();

    // 检查生成的 wiki 页面
    const files = await fs.readdir(wikiPath);
    const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md');

    expect(mdFiles.length).toBeGreaterThan(0);

    // 验证至少一个页面的结构
    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(wikiPath, file), 'utf-8');
      // 应该包含 frontmatter
      expect(content).toMatch(/^---\n/);
    }
  });

  it('should handle empty raw directory gracefully', async () => {
    const emptyRawPath = path.join(__dirname, 'fixtures', 'empty_vault', 'raw');
    const emptyWikiPath = path.join(__dirname, 'fixtures', 'empty_vault', 'wiki');

    // 创建空目录
    await fs.mkdir(emptyRawPath, { recursive: true });
    await fs.mkdir(emptyWikiPath, { recursive: true });

    const ontomark = new OntoMark({
      rawPath: emptyRawPath,
      wikiPath: emptyWikiPath,
      llmProvider: mockProvider as any,
    });

    const result = await ontomark.extract();

    expect(result.extractSuccess).toBe(0);
    expect(result.wikiPages).toBe(0);
    expect(result.extractFailed).toBe(0);

    // 清理
    await fs.rm(path.join(__dirname, 'fixtures', 'empty_vault'), {
      recursive: true,
      force: true,
    });
  });

  it('should support vaultPath backward compatibility', async () => {
    const ontomark = new OntoMark({
      vaultPath,
      llmProvider: mockProvider as any,
    });

    const result = await ontomark.extract();

    expect(result.extractSuccess).toBeGreaterThan(0);
    expect(result.wikiPages).toBeGreaterThan(0);
  });
});
