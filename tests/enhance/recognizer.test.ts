import { EntityRecognizer } from '../../src/enhance/recognizer';
import { DEFAULT_SCHEMA } from '../../src/schema/default';
import { LLMProvider, RecognizerInput, RecognizerOutput } from '../../src/llm/types';

describe('EntityRecognizer', () => {
  let recognizer: EntityRecognizer;
  let mockLLMProvider: LLMProvider;

  beforeEach(() => {
    mockLLMProvider = {
      recognize: jest.fn(),
    };
    recognizer = new EntityRecognizer(mockLLMProvider, DEFAULT_SCHEMA);
  });

  describe('recognize', () => {
    it('should call LLM provider with correct input', async () => {
      const mockOutput: RecognizerOutput = {
        entities: [
          { text: 'JWT', entityType: 'Concept', confidence: 0.9 },
        ],
      };
      (mockLLMProvider.recognize as jest.Mock).mockResolvedValue(mockOutput);

      const content = 'JWT is used for authentication.';
      const existingEntities = ['JWT', 'OAuth'];

      const result = await recognizer.recognize(content, existingEntities);

      expect(mockLLMProvider.recognize).toHaveBeenCalledWith({
        content,
        schema: DEFAULT_SCHEMA,
        existingEntities,
      });
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].text).toBe('JWT');
    });

    it('should find entities in index first (exact match)', async () => {
      const mockOutput: RecognizerOutput = { entities: [] };
      (mockLLMProvider.recognize as jest.Mock).mockResolvedValue(mockOutput);

      const content = 'JWT is used for authentication.';
      const existingEntities = ['JWT'];

      const result = await recognizer.recognize(content, existingEntities);

      // Should still call LLM but also return index matches
      expect(mockLLMProvider.recognize).toHaveBeenCalled();
    });

    it('should merge LLM results with index matches', async () => {
      const mockOutput: RecognizerOutput = {
        entities: [
          { text: 'authentication', entityType: 'Concept', confidence: 0.8 },
        ],
      };
      (mockLLMProvider.recognize as jest.Mock).mockResolvedValue(mockOutput);

      const content = 'JWT authentication';
      const existingEntities = ['JWT'];

      const result = await recognizer.recognize(content, existingEntities);

      expect(result.entities.some(e => e.text === 'JWT')).toBe(true);
    });
  });

  describe('buildPrompt', () => {
    it('should build prompt with schema info', () => {
      const prompt = recognizer.buildPrompt('Test content', ['Entity1']);

      expect(prompt).toContain('Test content');
      expect(prompt).toContain('Concept');
      expect(prompt).toContain('Entity1');
    });
  });
});
