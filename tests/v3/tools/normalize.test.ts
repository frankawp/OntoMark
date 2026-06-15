import {
  normalizeEntityName,
  normalizeWikiLink,
  extractAndNormalizeWikiLinks,
  normalizeWikiLinksInText,
} from '../../../src/v3/tools/normalize';

// parseWikiLinkTarget 需要测试，先 import
import { parseWikiLinkTarget } from '../../../src/v3/tools/normalize';

describe('normalize', () => {
  describe('normalizeEntityName', () => {
    it('should trim whitespace', () => {
      expect(normalizeEntityName('  John Doe  ')).toBe('John Doe');
    });

    it('should convert underscores to spaces', () => {
      expect(normalizeEntityName('John_Doe')).toBe('John Doe');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeEntityName('John   Doe')).toBe('John Doe');
    });

    it('should decode HTML entities', () => {
      expect(normalizeEntityName('John&amp;Doe')).toBe('John&Doe');
      expect(normalizeEntityName('It&#039;s')).toBe("It's");
      expect(normalizeEntityName('&quot;Quoted&quot;')).toBe('"Quoted"');
    });

    it('should decode URL encoding', () => {
      expect(normalizeEntityName('John%20Doe')).toBe('John Doe');
    });

    it('should remove .md extension', () => {
      expect(normalizeEntityName('John_Doe.md')).toBe('John Doe');
    });

    it('should keep accented characters', () => {
      expect(normalizeEntityName('José')).toBe('José');
      expect(normalizeEntityName('Beyoncé')).toBe('Beyoncé');
      expect(normalizeEntityName('François')).toBe('François');
      expect(normalizeEntityName('Müller')).toBe('Müller');
    });

    it('should handle CJK characters', () => {
      expect(normalizeEntityName('张三')).toBe('张三');
      expect(normalizeEntityName(' 李四 ')).toBe('李四');
    });

    it('should handle empty string', () => {
      // normalizeEntityName 在未提供参数时应该处理 undefined/空
      // 但 TypeScript 类型是 string，所以预期传入空字符串
      expect(normalizeEntityName('')).toBe('');
      expect(normalizeEntityName('   ')).toBe('');
    });
  });

  describe('parseWikiLinkTarget', () => {
    it('should extract simple link', () => {
      expect(parseWikiLinkTarget('Connor Bedard')).toBe('Connor Bedard');
    });

    it('should extract canonical from alias syntax', () => {
      expect(parseWikiLinkTarget('Connor Bedard|Bedard')).toBe('Connor Bedard');
    });

    it('should normalize the extracted target', () => {
      expect(parseWikiLinkTarget(' Connor_Bedard | Bedard ')).toBe('Connor Bedard');
    });

    it('should handle link without alias', () => {
      expect(parseWikiLinkTarget('Entity Name')).toBe('Entity Name');
    });
  });

  describe('normalizeWikiLink', () => {
    it('should wrap in [[]]', () => {
      expect(normalizeWikiLink('John Doe')).toBe('[[John Doe]]');
    });

    it('should normalize existing [[link]]', () => {
      expect(normalizeWikiLink('[[John_Doe]]')).toBe('[[John Doe]]');
    });

    it('should clean up whitespace', () => {
      expect(normalizeWikiLink('[[  John Doe  ]]')).toBe('[[John Doe]]');
    });

    it('should preserve alias syntax', () => {
      expect(normalizeWikiLink('[[Connor Bedard|Bedard]]')).toBe('[[Connor Bedard|Bedard]]');
    });

    it('should normalize target in alias syntax', () => {
      expect(normalizeWikiLink('[[ Connor_Bedard | Bedard ]]')).toBe('[[Connor Bedard|Bedard]]');
    });
  });

  describe('extractAndNormalizeWikiLinks', () => {
    it('should extract links from text', () => {
      const result = extractAndNormalizeWikiLinks('Hello [[John Doe]] and [[Jane Smith]]');
      expect(result).toEqual(['John Doe', 'Jane Smith']);
    });

    it('should extract canonical from alias syntax', () => {
      const result = extractAndNormalizeWikiLinks('See [[Connor Bedard|Bedard]]');
      expect(result).toEqual(['Connor Bedard']);
    });

    it('should deduplicate links', () => {
      const result = extractAndNormalizeWikiLinks('[[John Doe]] is here. [[John Doe]] is there.');
      expect(result).toEqual(['John Doe']);
    });

    it('should return empty array for no links', () => {
      const result = extractAndNormalizeWikiLinks('No links here');
      expect(result).toEqual([]);
    });
  });

  describe('normalizeWikiLinksInText', () => {
    it('should normalize all links in text', () => {
      const result = normalizeWikiLinksInText('See [[John_Doe]] and [[Jane_Smith.md]]');
      expect(result).toBe('See [[John Doe]] and [[Jane Smith]]');
    });

    it('should leave normal text unchanged', () => {
      const result = normalizeWikiLinksInText('Just plain text');
      expect(result).toBe('Just plain text');
    });
  });
});
