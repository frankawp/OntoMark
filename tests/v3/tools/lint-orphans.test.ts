import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { lintOrphans } from '../../../src/v3/tools/lint-orphans';

describe('lint-orphans', () => {
  let tempDir: string;
  let wikiDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
    wikiDir = path.join(tempDir, 'wiki');
    await fs.mkdir(wikiDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should find orphan pages with no incoming links', async () => {
    const personsDir = path.join(wikiDir, 'Persons');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(path.join(personsDir, 'Orphan.md'),
      '---\ncanonical: Orphan\nentity_type: Person\n---\n# Orphan\n\nNo incoming links.');
    await fs.writeFile(path.join(personsDir, 'Linked.md'),
      '---\ncanonical: Linked\nentity_type: Person\n---\n# Linked\n\nReferences [[Orphan]].');

    const result = await lintOrphans(tempDir);
    expect(result.orphans).toContain('Linked');
    expect(result.orphans).not.toContain('Orphan');
  });

  it('should return empty when all pages are linked', async () => {
    const personsDir = path.join(wikiDir, 'Persons');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(path.join(personsDir, 'A.md'),
      '---\ncanonical: A\nentity_type: Person\n---\n# A\n\nSee [[B]].');
    await fs.writeFile(path.join(personsDir, 'B.md'),
      '---\ncanonical: B\nentity_type: Person\n---\n# B\n\nSee [[A]].');

    const result = await lintOrphans(tempDir);
    expect(result.orphans).toHaveLength(0);
  });
});
