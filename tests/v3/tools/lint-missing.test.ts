import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { lintMissing } from '../../../src/v3/tools/lint-missing';

describe('lint-missing', () => {
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

  it('should find missing links', async () => {
    const personsDir = path.join(wikiDir, 'Persons');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(
      path.join(personsDir, 'Existing.md'),
      '---\ncanonical: Existing\nentity_type: Person\n---\n# Existing\n\nReferences [[Missing Person]] and [[Another Missing]].'
    );

    const result = await lintMissing(tempDir);
    expect(result.missing).toHaveLength(2);
    expect(result.missing.find((m) => m.entity === 'Missing Person')).toBeDefined();
    expect(result.missing.find((m) => m.entity === 'Missing Person')?.referencedBy).toContain('Existing');
  });

  it('should not report existing entities as missing', async () => {
    const personsDir = path.join(wikiDir, 'Persons');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(
      path.join(personsDir, 'A.md'),
      '---\ncanonical: A\nentity_type: Person\n---\n# A\n\nSee [[B]].'
    );
    await fs.writeFile(path.join(personsDir, 'B.md'), '---\ncanonical: B\nentity_type: Person\n---\n# B');

    const result = await lintMissing(tempDir);
    expect(result.missing).toHaveLength(0);
  });
});
