import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

describe('CLI', () => {
  const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
  const testVault = path.join(__dirname, 'fixtures', 'cli-vault');

  beforeAll(() => {
    // 构建项目
    execSync('npm run build', { cwd: path.join(__dirname, '..') });

    // 创建测试 vault
    fs.mkdirSync(testVault, { recursive: true });
    fs.writeFileSync(
      path.join(testVault, 'Test.md'),
      '# Test\n\nTest content.'
    );
  });

  afterAll(() => {
    // 清理测试 vault
    fs.rmSync(testVault, { recursive: true, force: true });
  });

  describe('index command', () => {
    it('should index vault', () => {
      const output = execSync(`node ${cliPath} index ${testVault}`, {
        encoding: 'utf-8',
      });

      expect(output).toContain('索引构建完成');
    });
  });

  describe('status command', () => {
    it('should show vault status', () => {
      const output = execSync(`node ${cliPath} status ${testVault}`, {
        encoding: 'utf-8',
      });

      expect(output).toContain('文件数量');
    });
  });

  describe('help', () => {
    it('should show help', () => {
      const output = execSync(`node ${cliPath} --help`, {
        encoding: 'utf-8',
      });

      expect(output).toContain('ontomark');
      expect(output).toContain('index');
      expect(output).toContain('enhance');
    });
  });
});
