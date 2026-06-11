import { WikiIndexBuilder } from '../../src/wiki/index-builder';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('WikiIndexBuilder', () => {
  const tempDir = path.join(__dirname, '../fixtures/temp-wiki');

  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should build index from wiki pages', async () => {
    // 创建测试页面
    await fs.writeFile(
      path.join(tempDir, 'FTX.md'),
      `---
name: FTX
type: Organization
---
# FTX
加密货币交易所`
    );

    const builder = new WikiIndexBuilder(tempDir);
    const index = await builder.build();

    expect(index.entities.Organization).toHaveLength(1);
    expect(index.entities.Organization[0].name).toBe('FTX');
  });

  it('should generate index.md content', async () => {
    await fs.writeFile(
      path.join(tempDir, 'FTX.md'),
      `---
name: FTX
type: Organization
---
# FTX
加密货币交易所`
    );

    const builder = new WikiIndexBuilder(tempDir);
    await builder.writeIndexFile();

    const content = await fs.readFile(path.join(tempDir, 'index.md'), 'utf-8');
    expect(content).toContain('# Wiki Index');
    expect(content).toContain('[[FTX]]');
  });
});
