/**
 * tests/builder/page-builder.test.ts
 * WikiPageBuilder 测试
 */
import { WikiPageBuilder } from '../../src/builder/page-builder';
import { ResolvedEntity } from '../../src/discovery/types';
import { OntologySchema } from '../../src/schema/types';

const schema: OntologySchema = {
  version: '1.0',
  entity_types: {
    Concept: {
      description: 'A concept',
      template: {
        summary: '定义和核心概念',
        info: [{ key: '定义' }, { key: '用途' }],
        sources: '来源',
        related: '相关概念',
        updated: '更新时间',
      },
    },
  },
};

describe('builder/page-builder', () => {
  describe('WikiPageBuilder', () => {
    it('应该构建 Wiki 页面', () => {
      const builder = new WikiPageBuilder(schema);

      const entity: ResolvedEntity = {
        canonicalName: 'JWT',
        aliases: ['JSON Web Token'],
        entityType: 'Concept',
        sources: [
          {
            file: 'raw/design.md',
            line: 10,
            context: 'JWT is used for authentication',
            timestamp: '2026-06-11',
          },
        ],
        confidence: 0.9,
        needsReview: false,
      };

      const page = builder.build(entity);

      expect(page.name).toBe('JWT');
      expect(page.filePath).toBe('Concepts/JWT.md');
      expect(page.content).toContain('# JWT');
      expect(page.frontmatter.canonical).toBe('JWT');
      expect(page.frontmatter.aliases).toContain('JSON Web Token');
    });

    it('应该在 frontmatter 中记录来源', () => {
      const builder = new WikiPageBuilder(schema);

      const entity: ResolvedEntity = {
        canonicalName: 'OAuth',
        aliases: [],
        entityType: 'Concept',
        sources: [
          { file: 'raw/a.md', line: 1, context: '', timestamp: '' },
          { file: 'raw/b.md', line: 5, context: '', timestamp: '' },
        ],
        confidence: 0.9,
        needsReview: false,
      };

      const page = builder.build(entity);

      expect(page.frontmatter.sources).toHaveLength(2);
      expect(page.frontmatter.sources[0].file).toBe('raw/a.md');
    });

    it('应该设置正确的状态', () => {
      const builder = new WikiPageBuilder(schema);

      const entity: ResolvedEntity = {
        canonicalName: 'Test',
        aliases: [],
        entityType: 'Concept',
        sources: [{ file: 'test.md', line: 1, context: '', timestamp: '' }],
        confidence: 0.9,
        needsReview: false,
      };

      const page = builder.build(entity);

      expect(page.frontmatter.status).toBe('canonical');
    });

    it('需要审核的实体应该标记为 draft 状态', () => {
      const builder = new WikiPageBuilder(schema);

      const entity: ResolvedEntity = {
        canonicalName: 'DraftEntity',
        aliases: [],
        entityType: 'Concept',
        sources: [{ file: 'test.md', line: 1, context: '', timestamp: '' }],
        confidence: 0.5,
        needsReview: true,
      };

      const page = builder.build(entity);

      expect(page.frontmatter.status).toBe('draft');
      expect(page.frontmatter.needs_review).toBe(true);
    });

    it('应该生成包含模板信息的正文', () => {
      const builder = new WikiPageBuilder(schema);

      const entity: ResolvedEntity = {
        canonicalName: 'JWT',
        aliases: ['JSON Web Token'],
        entityType: 'Concept',
        sources: [
          {
            file: 'raw/design.md',
            line: 10,
            context: 'JWT is used for authentication',
            timestamp: '2026-06-11',
          },
        ],
        confidence: 0.9,
        needsReview: false,
      };

      const page = builder.build(entity);

      // 检查正文结构
      expect(page.content).toContain('## 定义和核心概念');
      expect(page.content).toContain('## 关键信息');
      expect(page.content).toContain('## 来源');
      expect(page.content).toContain('| 定义 |');
      expect(page.content).toContain('| 用途 |');
    });

    it('应该处理没有别名的实体', () => {
      const builder = new WikiPageBuilder(schema);

      const entity: ResolvedEntity = {
        canonicalName: 'Test',
        aliases: [],
        entityType: 'Concept',
        sources: [{ file: 'test.md', line: 1, context: '', timestamp: '' }],
        confidence: 0.9,
        needsReview: false,
      };

      const page = builder.build(entity);

      expect(page.frontmatter.aliases).toBeUndefined();
    });
  });
});
