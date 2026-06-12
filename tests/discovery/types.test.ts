// tests/discovery/types.test.ts
import {
  EntityMention,
  ResolvedEntity,
  Evidence,
  ResolutionResult
} from '../../src/discovery/types';

describe('discovery/types', () => {
  describe('EntityMention', () => {
    it('应该正确定义实体提及', () => {
      const mention: EntityMention = {
        name: 'JWT',
        entityType: 'Concept',
        aliases: ['JSON Web Token'],
        context: ['JWT is used for authentication'],
        confidence: 0.9,
        location: {
          file: 'raw/design.md',
          line: 10,
          text: 'JWT',
        },
      };

      expect(mention.name).toBe('JWT');
      expect(mention.location.line).toBe(10);
    });
  });

  describe('ResolvedEntity', () => {
    it('应该正确定义消歧后的实体', () => {
      const entity: ResolvedEntity = {
        canonicalName: 'JWT',
        aliases: ['JSON Web Token', 'JsonWebToken'],
        entityType: 'Concept',
        sources: [],
        confidence: 0.9,
        needsReview: false,
      };

      expect(entity.canonicalName).toBe('JWT');
      expect(entity.needsReview).toBe(false);
    });
  });

  describe('Evidence', () => {
    it('应该正确定义证据', () => {
      const evidence: Evidence = {
        file: 'raw/design.md',
        line: 10,
        context: 'JWT is used for authentication',
        timestamp: '2026-06-11',
      };

      expect(evidence.file).toBe('raw/design.md');
      expect(evidence.line).toBe(10);
    });
  });
});
