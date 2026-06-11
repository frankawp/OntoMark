import { EntityLinker } from '../../src/enhance/linker';
import { MatchResult } from '../../src/enhance/types';

describe('EntityLinker', () => {
  let linker: EntityLinker;

  beforeEach(() => {
    linker = new EntityLinker();
  });

  describe('generateWikiLink', () => {
    it('should generate document link', () => {
      const match: MatchResult = {
        type: 'document',
        text: 'JWT',
        target: {
          fileName: 'JWT',
          filePath: 'Concepts/JWT.md',
        },
      };

      const result = linker.generateWikiLink(match);

      expect(result).toBe('[[JWT]]');
    });

    it('should generate alias link with display text', () => {
      const match: MatchResult = {
        type: 'alias',
        text: 'JSON Web Token',
        target: {
          fileName: 'JWT',
          filePath: 'Concepts/JWT.md',
        },
        original: 'JSON Web Token',
      };

      const result = linker.generateWikiLink(match);

      expect(result).toBe('[[JWT|JSON Web Token]]');
    });

    it('should generate heading link', () => {
      const match: MatchResult = {
        type: 'heading',
        text: 'Usage',
        target: {
          fileName: 'Usage',
          filePath: 'Concepts/JWT.md',
          heading: 'Usage',
        },
      };

      const result = linker.generateWikiLink(match);

      expect(result).toBe('[[Concepts/JWT.md#Usage]]');
    });

    it('should generate block reference link', () => {
      const match: MatchResult = {
        type: 'block',
        text: 'jwt-definition',
        target: {
          fileName: 'jwt-definition',
          filePath: 'Concepts/JWT.md',
          blockId: 'jwt-definition',
        },
      };

      const result = linker.generateWikiLink(match);

      expect(result).toBe('[[Concepts/JWT.md#^jwt-definition]]');
    });

    it('should return original text for unknown match', () => {
      const match: MatchResult = {
        type: 'unknown',
        text: 'NonExistent',
      };

      const result = linker.generateWikiLink(match);

      expect(result).toBe('NonExistent');
    });
  });

  describe('insertLinks', () => {
    it('should insert links into content', () => {
      const content = 'JWT is a token format.';
      const entities = [
        { text: 'JWT', start: 0, end: 3, link: '[[JWT]]' },
      ];

      const result = linker.insertLinks(content, entities);

      expect(result).toBe('[[JWT]] is a token format.');
    });

    it('should handle multiple entities', () => {
      const content = 'JWT and OAuth are authentication methods.';
      const entities = [
        { text: 'JWT', start: 0, end: 3, link: '[[JWT]]' },
        { text: 'OAuth', start: 8, end: 13, link: '[[OAuth]]' },
      ];

      const result = linker.insertLinks(content, entities);

      expect(result).toBe('[[JWT]] and [[OAuth]] are authentication methods.');
    });

    it('should handle overlapping entities (keep first)', () => {
      const content = 'JWT token';
      const entities = [
        { text: 'JWT', start: 0, end: 3, link: '[[JWT]]' },
        { text: 'token', start: 4, end: 9, link: '[[token]]' },
      ];

      const result = linker.insertLinks(content, entities);

      expect(result).toBe('[[JWT]] [[token]]');
    });

    it('should preserve existing wiki links', () => {
      const content = '[[JWT]] is already linked.';
      const entities: any[] = [];

      const result = linker.insertLinks(content, entities);

      expect(result).toBe('[[JWT]] is already linked.');
    });
  });
});
