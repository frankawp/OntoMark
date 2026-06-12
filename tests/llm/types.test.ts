// tests/llm/types.test.ts
// Task 1.6 - 测试 AIProvider 统一接口

import { AIProvider, AIProviderConfig, ExtractionResult, EntityExtraction, ClassificationResult } from '../../src/llm/types';
import { OntologySchema } from '../../src/schema/types';

describe('llm/types', () => {
  describe('AIProvider interface', () => {
    it('应该定义 extract 方法', () => {
      // AIProvider 应该有 extract 方法
      const provider: AIProvider = {
        extract: jest.fn(),
        classify: jest.fn(),
        generate: jest.fn(),
        isAvailable: jest.fn(),
      };

      expect(provider.extract).toBeDefined();
      expect(provider.classify).toBeDefined();
      expect(provider.generate).toBeDefined();
      expect(provider.isAvailable).toBeDefined();
    });

    it('extract 方法应该返回 ExtractionResult', async () => {
      const mockResult: ExtractionResult = {
        entities: [
          {
            name: '测试实体',
            aliases: ['别名1'],
            type: '概念',
            context: ['上下文文本'],
            confidence: 0.9,
          },
        ],
      };

      const provider: AIProvider = {
        extract: jest.fn().mockResolvedValue(mockResult),
        classify: jest.fn(),
        generate: jest.fn(),
        isAvailable: jest.fn(),
      };

      const schema: OntologySchema = {
        version: '1.0',
        entity_types: {},
      };

      const result = await provider.extract('测试文本', schema);

      expect(result).toEqual(mockResult);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('测试实体');
    });

    it('classify 方法应该返回 ClassificationResult', async () => {
      const mockResult: ClassificationResult = {
        type: '概念',
        confidence: 0.85,
      };

      const provider: AIProvider = {
        extract: jest.fn(),
        classify: jest.fn().mockResolvedValue(mockResult),
        generate: jest.fn(),
        isAvailable: jest.fn(),
      };

      const result = await provider.classify('测试文本', ['概念', '方法']);

      expect(result).toEqual(mockResult);
      expect(result.type).toBe('概念');
      expect(result.confidence).toBe(0.85);
    });

    it('generate 方法应该返回字符串', async () => {
      const provider: AIProvider = {
        extract: jest.fn(),
        classify: jest.fn(),
        generate: jest.fn().mockResolvedValue('生成的内容'),
        isAvailable: jest.fn(),
      };

      const result = await provider.generate('提示词', '上下文');

      expect(result).toBe('生成的内容');
    });

    it('isAvailable 方法应该返回布尔值', async () => {
      const provider: AIProvider = {
        extract: jest.fn(),
        classify: jest.fn(),
        generate: jest.fn(),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const result = await provider.isAvailable();

      expect(result).toBe(true);
    });
  });

  describe('AIProviderConfig interface', () => {
    it('应该定义必需的 apiKey', () => {
      const config: AIProviderConfig = {
        apiKey: 'test-api-key',
      };

      expect(config.apiKey).toBe('test-api-key');
    });

    it('应该支持可选的 model 和 baseURL', () => {
      const config: AIProviderConfig = {
        apiKey: 'test-api-key',
        model: 'gpt-4',
        baseURL: 'https://api.example.com',
      };

      expect(config.model).toBe('gpt-4');
      expect(config.baseURL).toBe('https://api.example.com');
    });
  });

  describe('ExtractionResult interface', () => {
    it('应该包含 entities 数组', () => {
      const result: ExtractionResult = {
        entities: [],
      };

      expect(Array.isArray(result.entities)).toBe(true);
    });
  });

  describe('EntityExtraction interface', () => {
    it('应该定义所有必需字段', () => {
      const entity: EntityExtraction = {
        name: '实体名称',
        aliases: ['别名'],
        type: '类型',
        context: ['上下文'],
        confidence: 0.9,
      };

      expect(entity.name).toBeDefined();
      expect(entity.aliases).toBeDefined();
      expect(entity.type).toBeDefined();
      expect(entity.context).toBeDefined();
      expect(entity.confidence).toBeDefined();
    });

    it('应该支持可选的 info 字段', () => {
      const entity: EntityExtraction = {
        name: '实体名称',
        aliases: [],
        type: '类型',
        context: [],
        confidence: 0.8,
        info: {
          key: 'value',
        },
      };

      expect(entity.info).toBeDefined();
      expect(entity.info?.key).toBe('value');
    });
  });

  describe('ClassificationResult interface', () => {
    it('应该定义 type 和 confidence', () => {
      const result: ClassificationResult = {
        type: '分类类型',
        confidence: 0.95,
      };

      expect(result.type).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });
});