import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { lintAll } from '../../../src/v3/tools/lint-all';

describe('lint-all', () => {
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

  it('should combine all lint checks', async () => {
    const personsDir = path.join(wikiDir, 'Persons');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(
      path.join(personsDir, 'Orphan.md'),
      '---\ncanonical: Orphan\nentity_type: Person\n---\n# Orphan'
    );
    await fs.writeFile(
      path.join(personsDir, 'WithMissing.md'),
      '---\ncanonical: WithMissing\nentity_type: Person\n---\n# WithMissing\n\nSee [[NonExistent]].'
    );

    const result = await lintAll(tempDir);
    expect(result.orphans).toContain('WithMissing');
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].entity).toBe('NonExistent');
    expect(result.totalIssues).toBeGreaterThan(0);
  });

  it('should detect empty pages', async () => {
    const personsDir = path.join(wikiDir, 'Persons');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(
      path.join(personsDir, 'Empty.md'),
      '---\ncanonical: Empty\nentity_type: Person\n---\n# Empty'
    );

    const result = await lintAll(tempDir);
    expect(result.empty).toContain('Empty');
  });
});
