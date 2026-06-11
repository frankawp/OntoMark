import * as path from 'path';
import * as fs from 'fs';
import { VaultScanner } from '../../src/index/scanner';

describe('VaultScanner', () => {
  const testVault = path.join(__dirname, '../fixtures/test-vault');

  beforeAll(() => {
    fs.mkdirSync(path.join(testVault, 'Concepts'), { recursive: true });
    fs.mkdirSync(path.join(testVault, 'Systems'), { recursive: true });
    fs.mkdirSync(path.join(testVault, '.ontomark'), { recursive: true });

    fs.writeFileSync(path.join(testVault, 'Concepts', 'JWT.md'), '# JWT\n\nJSON Web Token');
    fs.writeFileSync(path.join(testVault, 'Systems', 'Auth.md'), '# Auth\n\nAuthentication system');
    fs.writeFileSync(path.join(testVault, '.ontomark', 'cache.json'), '{}');
  });

  afterAll(() => {
    fs.rmSync(testVault, { recursive: true, force: true });
  });

  describe('scan', () => {
    it('should find all markdown files', async () => {
      const scanner = new VaultScanner(testVault);
      const files = await scanner.scan();

      expect(files.length).toBe(2);
      expect(files.some(f => f.endsWith('JWT.md'))).toBe(true);
      expect(files.some(f => f.endsWith('Auth.md'))).toBe(true);
    });

    it('should exclude hidden directories by default', async () => {
      const scanner = new VaultScanner(testVault);
      const files = await scanner.scan();

      expect(files.some(f => f.includes('.ontomark'))).toBe(false);
    });

    it('should respect exclude patterns', async () => {
      const scanner = new VaultScanner(testVault, ['**/Systems/**']);
      const files = await scanner.scan();

      expect(files.length).toBe(1);
      expect(files[0]).toContain('JWT.md');
    });
  });

  describe('scanWithInfo', () => {
    it('should return file info with stats', async () => {
      const scanner = new VaultScanner(testVault);
      const infos = await scanner.scanWithInfo();

      expect(infos.length).toBe(2);
      expect(infos[0]).toHaveProperty('path');
      expect(infos[0]).toHaveProperty('size');
    });
  });
});
