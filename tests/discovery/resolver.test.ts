// tests/discovery/resolver.test.ts
import { EntityResolver } from '../../src/discovery/resolver';
import { EntityMention } from '../../src/discovery/types';

describe('discovery/resolver', () => {
  describe('EntityResolver', () => {
    it('应该合并同名实体的别名', () => {
      const resolver = new EntityResolver();

      const mentions: EntityMention[] = [
        {
          name: 'JWT',
          entityType: 'Concept',
          aliases: ['JSON Web Token'],
          context: 'Context 1',
          confidence: 0.9,
          location: { file: 'a.md', line: 1, text: 'JWT' },
        },
        {
          name: 'JSON Web Token',
          entityType: 'Concept',
          aliases: ['JsonWebToken'],
          context: 'Context 2',
          confidence: 0.8,
          location: { file: 'b.md', line: 2, text: 'JSON Web Token' },
        },
      ];

      const result = resolver.resolve(mentions);

      expect(result.resolved).toHaveLength(1);
      expect(result.resolved[0].canonicalName).toBe('JWT');
      expect(result.resolved[0].aliases).toContain('JSON Web Token');
      expect(result.resolved[0].aliases).toContain('JsonWebToken');
    });

    it('应该标记同名不同类型的冲突', () => {
      const resolver = new EntityResolver();

      const mentions: EntityMention[] = [
        {
          name: 'JWT',
          entityType: 'Concept',
          aliases: [],
          context: 'As a concept',
          confidence: 0.9,
          location: { file: 'a.md', line: 1, text: 'JWT' },
        },
        {
          name: 'JWT',
          entityType: 'System',
          aliases: [],
          context: 'As a system',
          confidence: 0.9,
          location: { file: 'b.md', line: 1, text: 'JWT' },
        },
      ];

      const result = resolver.resolve(mentions);

      expect(result.needsReview).toHaveLength(1);
      expect(result.needsReview[0].needsReview).toBe(true);
    });

    it('应该标记低置信度的实体', () => {
      const resolver = new EntityResolver();

      const mentions: EntityMention[] = [
        {
          name: 'Unknown',
          entityType: 'Concept',
          aliases: [],
          context: 'Unclear context',
          confidence: 0.4,
          location: { file: 'a.md', line: 1, text: 'Unknown' },
        },
      ];

      const result = resolver.resolve(mentions);

      expect(result.needsReview).toHaveLength(1);
    });
  });
});
