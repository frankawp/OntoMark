import { md5, md5File } from '../../src/utils/md5';
import * as fs from 'fs';
import * as path from 'path';

describe('MD5 Utilities', () => {
  describe('md5', () => {
    it('should compute MD5 hash of a string', () => {
      const result = md5('hello world');
      expect(result).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3');
    });

    it('should return same hash for same input', () => {
      const result1 = md5('test');
      const result2 = md5('test');
      expect(result1).toBe(result2);
    });

    it('should return different hash for different input', () => {
      const result1 = md5('test1');
      const result2 = md5('test2');
      expect(result1).not.toBe(result2);
    });
  });

  describe('md5File', () => {
    const testFile = path.join(__dirname, 'test-md5-file.txt');

    beforeAll(() => {
      fs.writeFileSync(testFile, 'test content');
    });

    afterAll(() => {
      fs.unlinkSync(testFile);
    });

    it('should compute MD5 hash of a file', async () => {
      const result = await md5File(testFile);
      expect(result).toBe('9473fdd0d880a43c21b7778d34872157');
    });
  });
});
