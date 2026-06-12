import {
  OntoMarkError,
  ValidationError,
  ExtractionError,
  ResolutionConflictError,
  LLMProviderError
} from '../../src/utils/errors';

describe('utils/errors (V2)', () => {
  describe('ValidationError', () => {
    it('应该创建验证错误', () => {
      const error = new ValidationError('Invalid directory structure');
      expect(error.message).toBe('Invalid directory structure');
      expect(error.name).toBe('ValidationError');
      expect(error).toBeInstanceOf(OntoMarkError);
    });
  });

  describe('ExtractionError', () => {
    it('应该创建提取错误', () => {
      const error = new ExtractionError('Failed to extract from file', 'raw/test.md');
      expect(error.message).toBe('Failed to extract from file');
      expect(error.filePath).toBe('raw/test.md');
    });
  });

  describe('ResolutionConflictError', () => {
    it('应该创建消歧冲突错误', () => {
      const error = new ResolutionConflictError(
        'JWT',
        ['JWT (Auth)', 'JWT (Security)'],
        'different_types'
      );
      expect(error.message).toContain('JWT');
      expect(error.candidates).toHaveLength(2);
    });
  });

  describe('LLMProviderError', () => {
    it('应该创建 LLM Provider 错误', () => {
      const error = new LLMProviderError('API key invalid', 'openai');
      expect(error.provider).toBe('openai');
    });
  });
});
