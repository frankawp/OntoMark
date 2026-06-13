/**
 * index-build 工具测试
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { indexBuild } from '../../../src/v3/tools/index-build';

describe('index-build', () => {
  let tempDir: string;
  let wikiDir: string;
  let ontomarkDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
    wikiDir = path.join(tempDir, 'wiki');
    ontomarkDir = path.join(tempDir, '.ontomark');
    await fs.mkdir(wikiDir, { recursive: true });
    await fs.mkdir(ontomarkDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should create index from wiki files', async () => {
    const personsDir = path.join(wikiDir, 'Persons');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(
      path.join(personsDir, 'John_Doe.md'),
      '---\ncanonical: John Doe\nentity_type: Person\naliases:\n  - Johnny\n  - JD\n---\n# John Doe'
    );
    await fs.writeFile(
      path.join(personsDir, 'Jane_Doe.md'),
      '---\ncanonical: Jane Doe\nentity_type: Person\n---\n# Jane Doe'
    );

    const result = await indexBuild(tempDir);
    expect(result.entities['John Doe']).toBeDefined();
    expect(result.entities['John Doe'].type).toBe('Person');
    expect(result.aliases['Johnny']).toBe('John Doe');
    expect(result.aliases['JD']).toBe('John Doe');
  });

  it('should save index to .ontomark/index.json', async () => {
    const personsDir = path.join(wikiDir, 'Persons');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(
      path.join(personsDir, 'Test.md'),
      '---\ncanonical: Test\nentity_type: Person\n---\n# Test'
    );

    await indexBuild(tempDir);
    const data = JSON.parse(await fs.readFile(path.join(ontomarkDir, 'index.json'), 'utf-8'));
    expect(data.entities['Test']).toBeDefined();
  });

  it('should handle empty wiki', async () => {
    const result = await indexBuild(tempDir);
    expect(Object.keys(result.entities)).toHaveLength(0);
    expect(Object.keys(result.aliases)).toHaveLength(0);
  });
});
