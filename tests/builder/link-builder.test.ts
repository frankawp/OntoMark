/**
 * tests/builder/link-builder.test.ts
 *
 * LinkBuilder 测试用例
 */
import { LinkBuilder } from '../../src/builder/link-builder';
import { EntityCache } from '../../src/storage/cache';

const mockCache: EntityCache = {
  entities: new Map([
    ['JWT', { name: 'JWT', entityType: 'Concept', sources: [], wikiPagePath: 'wiki/Concepts/JWT.md', hash: '' }],
    ['OAuth', { name: 'OAuth', entityType: 'Concept', sources: [], wikiPagePath: 'wiki/Concepts/OAuth.md', hash: '' }],
  ]),
  aliases: new Map([
    ['json web token', 'JWT'],
    ['jwt', 'JWT'],
    ['oauth', 'OAuth'],
  ]),
  lastScan: '',
  schemaHash: '',
};

describe('builder/link-builder', () => {
  describe('LinkBuilder', () => {
    it('应该构建实体索引', () => {
      const builder = new LinkBuilder(mockCache);
      const index = builder.buildEntityIndex();

      expect(index).toContain('JWT');
      expect(index).toContain('OAuth');
    });

    it('应该在内容中生成链接', () => {
      const builder = new LinkBuilder(mockCache);
      const content = 'JWT is used with OAuth for authentication.';

      const result = builder.addLinks(content);

      expect(result.content).toBe('[[JWT]] is used with [[OAuth]] for authentication.');
      expect(result.linksAdded).toBe(2);
    });

    it('不应该重复链接已有的链接', () => {
      const builder = new LinkBuilder(mockCache);
      const content = '[[JWT]] is already linked.';

      const result = builder.addLinks(content);

      expect(result.content).toBe('[[JWT]] is already linked.');
      expect(result.linksAdded).toBe(0);
    });

    it('应该处理多个相同实体', () => {
      const builder = new LinkBuilder(mockCache);
      const content = 'JWT and JWT are the same.';

      const result = builder.addLinks(content);

      expect(result.content).toBe('[[JWT]] and [[JWT]] are the same.');
      expect(result.linksAdded).toBe(2);
    });

    it('应该处理空内容', () => {
      const builder = new LinkBuilder(mockCache);
      const content = '';

      const result = builder.addLinks(content);

      expect(result.content).toBe('');
      expect(result.linksAdded).toBe(0);
    });

    it('应该处理没有匹配实体的内容', () => {
      const builder = new LinkBuilder(mockCache);
      const content = 'This is a test without entities.';

      const result = builder.addLinks(content);

      expect(result.content).toBe('This is a test without entities.');
      expect(result.linksAdded).toBe(0);
    });
  });
});
