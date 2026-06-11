import {
  normalizePath,
  isMarkdownFile,
  getFileNameWithoutExtension,
  resolveVaultPath,
} from '../../src/utils/path';

describe('Path Utilities', () => {
  describe('normalizePath', () => {
    it('should normalize path separators', () => {
      expect(normalizePath('folder\\file.md')).toBe('folder/file.md');
      expect(normalizePath('./folder/../file.md')).toBe('file.md');
    });
  });

  describe('isMarkdownFile', () => {
    it('should return true for .md files', () => {
      expect(isMarkdownFile('test.md')).toBe(true);
      expect(isMarkdownFile('folder/test.md')).toBe(true);
    });

    it('should return false for non-.md files', () => {
      expect(isMarkdownFile('test.txt')).toBe(false);
      expect(isMarkdownFile('test.markdown')).toBe(false);
    });
  });

  describe('getFileNameWithoutExtension', () => {
    it('should return filename without extension', () => {
      expect(getFileNameWithoutExtension('JWT.md')).toBe('JWT');
      expect(getFileNameWithoutExtension('folder/JWT.md')).toBe('JWT');
    });
  });

  describe('resolveVaultPath', () => {
    it('should resolve relative path to absolute', () => {
      const result = resolveVaultPath('./notes', '/home/user');
      expect(result).toBe('/home/user/notes');
    });
  });
});