/**
 * tests/builder/index-builder.test.ts
 * WikiIndexBuilder 测试
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { WikiIndexBuilder } from '../../src/builder/index-builder';

describe('builder/index-builder', () => {
  const testWiki = path.join(__dirname, 'test-wiki');

  beforeEach(async () => {
    await fs.mkdir(path.join(testWiki, 'Concepts'), { recursive: true });

    await fs.writeFile(
      path.join(testWiki, 'Concepts', 'JWT.md'),
      `---
canonical: JWT
entity_type: Concept
---
# JWT
JWT is a token format.`,
      'utf-8'
    );
  });

  afterEach(async () => {
    await fs.rm(testWiki, { recursive: true, force: true });
  });

  it('应该生成 index.md', async () => {
    const builder = new WikiIndexBuilder(testWiki);
    await builder.writeIndexFile();

    const indexContent = await fs.readFile(path.join(testWiki, 'index.md'), 'utf-8');

    expect(indexContent).toContain('# Wiki Index');
    expect(indexContent).toContain('JWT');
  });

  it('应该包含实体类型分组', async () => {
    const builder = new WikiIndexBuilder(testWiki);
    await builder.writeIndexFile();

    const indexContent = await fs.readFile(path.join(testWiki, 'index.md'), 'utf-8');

    expect(indexContent).toContain('## Concept (1)');
  });

  it('应该包含实体摘要', async () => {
    const builder = new WikiIndexBuilder(testWiki);
    await builder.writeIndexFile();

    const indexContent = await fs.readFile(path.join(testWiki, 'index.md'), 'utf-8');

    expect(indexContent).toContain('JWT is a token format');
  });

  it('应该包含最后更新时间', async () => {
    const builder = new WikiIndexBuilder(testWiki);
    await builder.writeIndexFile();

    const indexContent = await fs.readFile(path.join(testWiki, 'index.md'), 'utf-8');

    expect(indexContent).toContain('> 最后更新：');
  });

  it('应该处理多个实体类型', async () => {
    await fs.mkdir(path.join(testWiki, 'Systems'), { recursive: true });
    await fs.writeFile(
      path.join(testWiki, 'Systems', 'AuthService.md'),
      `---
canonical: AuthService
entity_type: System
---
# AuthService
Authentication service.`,
      'utf-8'
    );

    const builder = new WikiIndexBuilder(testWiki);
    await builder.writeIndexFile();

    const indexContent = await fs.readFile(path.join(testWiki, 'index.md'), 'utf-8');

    expect(indexContent).toContain('## Concept (1)');
    expect(indexContent).toContain('## System (1)');
    expect(indexContent).toContain('JWT');
    expect(indexContent).toContain('AuthService');
  });

  it('应该按名称排序实体', async () => {
    await fs.writeFile(
      path.join(testWiki, 'Concepts', 'OAuth.md'),
      `---
canonical: OAuth
entity_type: Concept
---
# OAuth
OAuth is an authorization protocol.`,
      'utf-8'
    );

    const builder = new WikiIndexBuilder(testWiki);
    await builder.writeIndexFile();

    const indexContent = await fs.readFile(path.join(testWiki, 'index.md'), 'utf-8');

    const jwtIndex = indexContent.indexOf('[[JWT]]');
    const oauthIndex = indexContent.indexOf('[[OAuth]]');
    expect(jwtIndex).toBeLessThan(oauthIndex);
  });

  it('应该忽略 index.md 文件', async () => {
    await fs.writeFile(
      path.join(testWiki, 'index.md'),
      `---
canonical: IndexPage
entity_type: Page
---
# Index`,
      'utf-8'
    );

    const builder = new WikiIndexBuilder(testWiki);
    await builder.writeIndexFile();

    const indexContent = await fs.readFile(path.join(testWiki, 'index.md'), 'utf-8');

    expect(indexContent).not.toContain('IndexPage');
  });

  it('应该处理没有 frontmatter 的文件', async () => {
    await fs.writeFile(
      path.join(testWiki, 'Concepts', 'NoMeta.md'),
      `# NoMeta
This file has no frontmatter.`,
      'utf-8'
    );

    const builder = new WikiIndexBuilder(testWiki);
    await builder.writeIndexFile();

    const indexContent = await fs.readFile(path.join(testWiki, 'index.md'), 'utf-8');

    expect(indexContent).toContain('JWT');
    expect(indexContent).not.toContain('NoMeta');
  });
});
