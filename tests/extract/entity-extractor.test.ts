// EntityExtractor 组件测试

import { EntityExtractor } from '../../src/extract/entity-extractor';
import { OntologySchema } from '../../src/schema/types';
import { LLMProvider } from '../../src/llm/types';

describe('EntityExtractor', () => {
  const mockSchema: OntologySchema = {
    version: '1.0',
    entity_types: {
      Person: { description: '人物' },
      Organization: { description: '组织' },
    },
  };

  const mockProvider = {
    recognize: jest.fn(),
    extract: jest.fn().mockResolvedValue({
      entities: [
        {
          name: 'FTX',
          aliases: [],
          type: 'Organization',
          context: ['FTX is a crypto exchange.'],
          confidence: 0.9,
          info: {},
        },
      ],
    }),
  };

  it('should extract entities from raw document', async () => {
    const extractor = new EntityExtractor(mockSchema, mockProvider as unknown as LLMProvider);

    const result = await extractor.extract('raw/test.md', 'FTX is a cryptocurrency exchange.');

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].name).toBe('FTX');
    expect(result.rawPath).toBe('raw/test.md');
  });

  it('should add sourcePath to extracted entities', async () => {
    const extractor = new EntityExtractor(mockSchema, mockProvider as unknown as LLMProvider);

    const result = await extractor.extract('raw/example.md', 'Some content');

    expect(result.entities[0].sourcePath).toBe('raw/example.md');
  });

  it('should return empty entities when extract method is not available', async () => {
    const providerWithoutExtract = {
      recognize: jest.fn(),
    };

    const extractor = new EntityExtractor(mockSchema, providerWithoutExtract as unknown as LLMProvider);

    const result = await extractor.extract('raw/test.md', 'Some content');

    expect(result.entities).toHaveLength(0);
    expect(result.processed).toBe(true);
  });

  it('should mark processed as false on error', async () => {
    const errorProvider = {
      recognize: jest.fn(),
      extract: jest.fn().mockRejectedValue(new Error('LLM error')),
    };

    const extractor = new EntityExtractor(mockSchema, errorProvider as unknown as LLMProvider);

    const result = await extractor.extract('raw/test.md', 'Some content');

    expect(result.entities).toHaveLength(0);
    expect(result.processed).toBe(false);
  });
});
