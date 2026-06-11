import { EntityResolver } from '../../src/enhance/resolver';
import { EntityIndex } from '../../src/index/types';
import { ConflictError } from '../../src/utils/errors';

describe('EntityResolver', () => {
  let resolver: EntityResolver;
  let mockIndex: EntityIndex;

  beforeEach(() => {
    resolver = new EntityResolver();

    mockIndex = {
      entities: new Map([
        ['Concepts/JWT.md', {
          filePath: 'Concepts/JWT.md',
          fileName: 'JWT',
          entityType: 'Concept',
          aliases: ['JSON Web Token'],
          headings: ['JWT', 'Usage'],
          blocks: ['jwt-definition'],
          fileHash: 'hash1',
        }],
        ['Systems/Auth.md', {
          filePath: 'Systems/Auth.md',
          fileName: 'Auth',
          entityType: 'System',
          aliases: [],
          headings: ['Auth', 'Login'],
          blocks: [],
          fileHash: 'hash2',
        }],
      ]),
      aliasIndex: new Map([
        ['JSON Web Token', ['Concepts/JWT.md']],
      ]),
      headingIndex: new Map([
        ['Usage', [{ filePath: 'Concepts/JWT.md', heading: 'Usage', level: 2 }]],
        ['Login', [{ filePath: 'Systems/Auth.md', heading: 'Login', level: 1 }]],
      ]),
      blockIndex: new Map([
        ['jwt-definition', { filePath: 'Concepts/JWT.md', blockId: 'jwt-definition' }],
      ]),
    };
  });

  describe('matchEntity', () => {
    it('should match exact document name', () => {
      const result = resolver.matchEntity('JWT', mockIndex);

      expect(result.type).toBe('document');
      expect(result.target?.fileName).toBe('JWT');
      expect(result.target?.filePath).toBe('Concepts/JWT.md');
    });

    it('should match alias', () => {
      const result = resolver.matchEntity('JSON Web Token', mockIndex);

      expect(result.type).toBe('alias');
      expect(result.target?.fileName).toBe('JWT');
      expect(result.original).toBe('JSON Web Token');
    });

    it('should match heading', () => {
      const result = resolver.matchEntity('Usage', mockIndex);

      expect(result.type).toBe('heading');
      expect(result.target?.heading).toBe('Usage');
    });

    it('should match block reference', () => {
      const result = resolver.matchEntity('jwt-definition', mockIndex);

      expect(result.type).toBe('block');
      expect(result.target?.blockId).toBe('jwt-definition');
    });

    it('should return unknown for no match', () => {
      const result = resolver.matchEntity('NonExistent', mockIndex);

      expect(result.type).toBe('unknown');
    });
  });

  describe('resolve', () => {
    it('should resolve without conflict', () => {
      const result = resolver.resolve('JWT', mockIndex);

      expect(result.resolved).toBe(true);
      expect(result.match?.type).toBe('document');
    });

    it('should detect alias conflict', () => {
      // Add conflicting alias
      mockIndex.aliasIndex.set('Token', ['Concepts/JWT.md', 'Security/Token.md']);

      const result = resolver.resolve('Token', mockIndex);

      expect(result.resolved).toBe(false);
      expect(result.conflict).toBeDefined();
      expect(result.conflict?.conflictType).toBe('alias');
      expect(result.conflict?.candidates.length).toBe(2);
    });

    it('should detect heading conflict', () => {
      // Add conflicting heading
      mockIndex.headingIndex.set('Shared', [
        { filePath: 'File1.md', heading: 'Shared', level: 1 },
        { filePath: 'File2.md', heading: 'Shared', level: 1 },
      ]);

      const result = resolver.resolve('Shared', mockIndex);

      expect(result.resolved).toBe(false);
      expect(result.conflict?.conflictType).toBe('heading');
    });
  });

  describe('matchPriority', () => {
    it('should prioritize document over alias', () => {
      // Create scenario where text matches both document and alias
      mockIndex.entities.set('Test.md', {
        filePath: 'Test.md',
        fileName: 'Test',
        aliases: [],
        headings: [],
        blocks: [],
        fileHash: 'hash',
      });
      mockIndex.aliasIndex.set('Test', ['Other.md']);

      const result = resolver.matchEntity('Test', mockIndex);

      expect(result.type).toBe('document');
    });
  });
});
