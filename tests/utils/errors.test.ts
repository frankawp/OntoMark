import { OntoMarkError, SchemaError, ConflictError } from '../../src/utils/errors';

describe('Error Types', () => {
  describe('OntoMarkError', () => {
    it('should create error with message', () => {
      const error = new OntoMarkError('test error');
      expect(error.message).toBe('test error');
      expect(error.name).toBe('OntoMarkError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('SchemaError', () => {
    it('should create error with message and file path', () => {
      const error = new SchemaError('invalid schema', '/path/to/schema.yaml');
      expect(error.message).toBe('invalid schema');
      expect(error.name).toBe('SchemaError');
      expect(error.filePath).toBe('/path/to/schema.yaml');
      expect(error).toBeInstanceOf(OntoMarkError);
    });
  });

  describe('ConflictError', () => {
    it('should create error with conflict details', () => {
      const candidates = [
        { filePath: 'Auth/JWT.md', entityType: 'Concept', matchType: 'alias' as const },
        { filePath: 'Security/JWT.md', entityType: 'Concept', matchType: 'alias' as const },
      ];
      const error = new ConflictError('alias', 'JWT', candidates);
      expect(error.message).toBe('冲突: "JWT" 匹配到多个实体');
      expect(error.name).toBe('ConflictError');
      expect(error.conflictType).toBe('alias');
      expect(error.text).toBe('JWT');
      expect(error.candidates).toEqual(candidates);
      expect(error).toBeInstanceOf(OntoMarkError);
    });
  });
});