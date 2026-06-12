// OpenAI Provider 测试
// 使用 TDD 方式实现

import { OpenAIProvider } from '../../src/llm/openai-provider';
import { OntologySchema } from '../../src/schema/types';

// Mock OpenAI - 使用模块内变量方式
const mockCreate = jest.fn();
const mockList = jest.fn();

jest.mock('openai', () => {
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
    models: {
      list: mockList,
    },
  }));
  return {
    __esModule: true,
    default: MockOpenAI,
  };
});

describe('llm/openai-provider', () => {
  const schema: OntologySchema = {
    version: '1.0',
    entity_types: {
      Concept: { description: 'A concept' },
    },
  };

  beforeEach(() => {
    // 重置所有 mock
    mockCreate.mockReset();
    mockList.mockReset();
  });

  describe('constructor', () => {
    it('应该使用 API Key 初始化', () => {
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
      });
      expect(provider).toBeDefined();
    });

    it('应该支持自定义 baseURL（用于 DeepSeek 等兼容 API）', () => {
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        baseURL: 'https://api.deepseek.com',
      });
      expect(provider).toBeDefined();
    });

    it('应该支持自定义模型', () => {
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4',
      });
      expect(provider).toBeDefined();
    });
  });

  describe('extract', () => {
    it('应该从文本中提取实体', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
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
          },
        }],
      });

      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      const result = await provider.extract('JWT is used for auth.', schema);

      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('JWT');
      expect(result.entities[0].type).toBe('Concept');
    });

    it('应该返回空数组当 API 调用失败时', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API Error'));

      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      const result = await provider.extract('test text', schema);

      expect(result.entities).toEqual([]);
    });
  });

  describe('classify', () => {
    it('应该对文本进行分类', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({ type: 'Technical', confidence: 0.85 }),
          },
        }],
      });

      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      const result = await provider.classify('This is a technical document', ['Technical', 'Business']);

      expect(result.type).toBe('Technical');
      expect(result.confidence).toBe(0.85);
    });

    it('应该返回默认分类当 API 调用失败时', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API Error'));

      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      const result = await provider.classify('test text', ['Technical', 'Business']);

      expect(result.type).toBe('Technical');
      expect(result.confidence).toBe(0);
    });
  });

  describe('generate', () => {
    it('应该生成文本内容', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Generated content here',
          },
        }],
      });

      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      const result = await provider.generate('Write a summary', 'You are a helpful assistant');

      expect(result).toBe('Generated content here');
    });

    it('应该返回空字符串当 API 调用失败时', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API Error'));

      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      const result = await provider.generate('Write something', 'context');

      expect(result).toBe('');
    });
  });

  describe('isAvailable', () => {
    it('应该返回 true 当 API 可用时', async () => {
      mockList.mockResolvedValueOnce({});

      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      const available = await provider.isAvailable();

      expect(available).toBe(true);
    });

    it('应该返回 false 当 API 不可用时', async () => {
      mockList.mockRejectedValueOnce(new Error('Connection failed'));

      const provider = new OpenAIProvider({ apiKey: 'test-key' });
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });
  });
});
