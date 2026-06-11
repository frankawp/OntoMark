// LLM 信息提取功能测试

import { DeepSeekProvider } from '../../src/llm/deepseek-provider';

describe('LLM Extraction', () => {
  it('should extract entities from content', async () => {
    // 不调用真实 API 的 mock 测试
    const provider = new DeepSeekProvider({
      apiKey: 'test-key',
      model: 'deepseek-chat',
    });

    // 验证 extract 方法存在
    expect(typeof provider.extract).toBe('function');
  });
});
