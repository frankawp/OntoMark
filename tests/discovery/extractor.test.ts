// tests/discovery/extractor.test.ts
import { EntityExtractor } from '../../src/discovery/extractor';
import { AIProvider } from '../../src/llm/types';
import { OntologySchema } from '../../src/schema/types';

const mockProvider: AIProvider = {
  extract: jest.fn().mockResolvedValue({
    entities: [
      {
        name: 'JWT',
        aliases: ['JSON Web Token'],
        type: 'Concept',
        context: ['JWT is used for authentication'],
        confidence: 0.9,
      },
    ],
  }),
  classify: jest.fn(),
  generate: jest.fn(),
  isAvailable: jest.fn().mockResolvedValue(true),
};

const schema: OntologySchema = {
  version: '1.0',
  entity_types: {
    Concept: { description: 'A concept or idea' },
  },
};

describe('discovery/extractor', () => {
  describe('EntityExtractor', () => {
    it('应该从内容提取实体', async () => {
      const extractor = new EntityExtractor(schema, mockProvider);
      const result = await extractor.extractFromContent(
        'JWT is used for authentication.',
        'raw/test.md'
      );

      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('JWT');
      expect(result.entities[0].location.file).toBe('raw/test.md');
    });

    it('应该记录元数据', async () => {
      const extractor = new EntityExtractor(schema, mockProvider);
      const result = await extractor.extractFromContent(
        'Test content',
        'raw/test.md'
      );

      expect(result.metadata.sourceFile).toBe('raw/test.md');
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.hash).toBeDefined();
    });

    it('应该正确映射实体类型', async () => {
      const extractor = new EntityExtractor(schema, mockProvider);
      const result = await extractor.extractFromContent(
        'JWT is used for authentication.',
        'raw/test.md'
      );

      expect(result.entities[0].entityType).toBe('Concept');
      expect(result.entities[0].aliases).toContain('JSON Web Token');
      expect(result.entities[0].confidence).toBe(0.9);
    });

    it('应该正确计算行号', async () => {
      const extractor = new EntityExtractor(schema, mockProvider);
      const content = 'First line\nSecond line JWT here\nThird line';
      const result = await extractor.extractFromContent(content, 'raw/test.md');

      expect(result.entities[0].location.line).toBe(2);
    });

    it('应该处理空实体列表', async () => {
      const emptyProvider: AIProvider = {
        extract: jest.fn().mockResolvedValue({ entities: [] }),
        classify: jest.fn(),
        generate: jest.fn(),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const extractor = new EntityExtractor(schema, emptyProvider);
      const result = await extractor.extractFromContent(
        'No entities here.',
        'raw/empty.md'
      );

      expect(result.entities).toHaveLength(0);
      expect(result.metadata.sourceFile).toBe('raw/empty.md');
    });
  });
});