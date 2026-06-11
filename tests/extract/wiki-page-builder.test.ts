// tests/extract/wiki-page-builder.test.ts
import { WikiPageBuilder } from '../../src/extract/wiki-page-builder';
import { OntologySchema } from '../../src/schema/types';
import { MergedEntity } from '../../src/extract/entity-merger';

describe('WikiPageBuilder', () => {
  const schema: OntologySchema = {
    version: '1.0',
    entity_types: {
      Organization: {
        description: '组织',
        template: {
          summary: '一句话简介',
          info: [
            { key: '行业' },
            { key: '关键事件' },
          ],
          sources: '来源',
          related: '相关',
          updated: '更新时间',
        },
      },
    },
  };

  const mockProvider = {
    recognize: jest.fn(),
    extract: jest.fn(),
  };

  it('should build wiki page from merged entity', async () => {
    const builder = new WikiPageBuilder(schema, mockProvider as any);

    const merged: MergedEntity = {
      name: 'FTX',
      aliases: new Set(['FTX Exchange']),
      type: 'Organization',
      context: [
        'FTX is a cryptocurrency exchange.',
        'FTX filed for bankruptcy in 2022.',
      ],
      sources: ['raw/1.md', 'raw/2.md'],
      info: {},
      confidence: 0.9,
    };

    const page = await builder.build(merged);

    expect(page.name).toBe('FTX');
    expect(page.frontmatter.name).toBe('FTX');
    expect(page.frontmatter.aliases).toContain('FTX Exchange');
    expect(page.content).toContain('# FTX');
  });

  it('should include info table when merged entity has info', async () => {
    const builder = new WikiPageBuilder(schema, mockProvider as any);

    const merged: MergedEntity = {
      name: '阿里巴巴',
      aliases: new Set(['Ali Baba', 'Alibaba Group']),
      type: 'Organization',
      context: ['阿里巴巴是中国电商巨头。'],
      sources: ['raw/alibaba.md'],
      info: {
        '行业': '电商',
        '关键事件': '2014年纽交所上市',
      },
      confidence: 0.95,
    };

    const page = await builder.build(merged);

    expect(page.content).toContain('## 关键信息');
    expect(page.content).toContain('| 行业 | 电商 |');
    expect(page.content).toContain('| 关键事件 | 2014年纽交所上市 |');
  });

  it('should generate correct file path', async () => {
    const builder = new WikiPageBuilder(schema, mockProvider as any);

    const merged: MergedEntity = {
      name: 'SpaceX',
      aliases: new Set(),
      type: 'Organization',
      context: ['SpaceX is a space exploration company.'],
      sources: ['raw/spacex.md'],
      info: {},
      confidence: 0.9,
    };

    const page = await builder.build(merged);

    expect(page.filePath).toBe('SpaceX.md');
  });

  it('should sanitize file name with special characters', async () => {
    const builder = new WikiPageBuilder(schema, mockProvider as any);

    const merged: MergedEntity = {
      name: 'Open AI Labs',
      aliases: new Set(),
      type: 'Organization',
      context: ['Open AI Labs is a research lab.'],
      sources: ['raw/openai.md'],
      info: {},
      confidence: 0.9,
    };

    const page = await builder.build(merged);

    expect(page.filePath).toBe('Open_AI_Labs.md');
  });

  it('should handle entity without aliases', async () => {
    const builder = new WikiPageBuilder(schema, mockProvider as any);

    const merged: MergedEntity = {
      name: 'Tesla',
      aliases: new Set(),
      type: 'Organization',
      context: ['Tesla is an EV company.'],
      sources: ['raw/tesla.md'],
      info: {},
      confidence: 0.9,
    };

    const page = await builder.build(merged);

    expect(page.frontmatter.aliases).toEqual([]);
  });

  it('should format sources as Obsidian links', async () => {
    const builder = new WikiPageBuilder(schema, mockProvider as any);

    const merged: MergedEntity = {
      name: 'Test',
      aliases: new Set(),
      type: 'Organization',
      context: [],
      sources: ['raw/article-one.md', 'raw/article-two.md'],
      info: {},
      confidence: 0.8,
    };

    const page = await builder.build(merged);

    expect(page.content).toContain('- [[article-one]]');
    expect(page.content).toContain('- [[article-two]]');
  });

  it('should work without LLM provider', async () => {
    const builder = new WikiPageBuilder(schema);

    const merged: MergedEntity = {
      name: 'NoLLM',
      aliases: new Set(),
      type: 'Organization',
      context: ['No LLM provider test.'],
      sources: ['raw/test.md'],
      info: {},
      confidence: 0.9,
    };

    const page = await builder.build(merged);

    expect(page.name).toBe('NoLLM');
    expect(page.filePath).toBe('NoLLM.md');
  });
});