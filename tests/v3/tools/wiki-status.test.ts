// tests/v3/tools/wiki-status.test.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { wikiStatus } from '../../../src/v3/tools/wiki-status';

describe('wiki-status', () => {
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

  it('should return empty when no wiki files', async () => {
    const result = await wikiStatus(tempDir);
    expect(result.total).toBe(0);
    expect(result.files).toEqual([]);
  });

  it('should list all wiki pages', async () => {
    const personsDir = path.join(wikiDir, 'Persons');
    await fs.mkdir(personsDir, { recursive: true });

    const content = `---
canonical: John Doe
entity_type: Person
aliases:
  - Johnny
sources:
  - file: raw/test.md
    lines: [1]
status: canonical
last_updated: 2026-06-13
---
# John Doe

Test content.`;

    await fs.writeFile(path.join(personsDir, 'John_Doe.md'), content);

    const result = await wikiStatus(tempDir);
    expect(result.total).toBe(1);
    expect(result.files[0].canonical).toBe('John Doe');
    expect(result.files[0].type).toBe('Person');
  });

  it('should detect human edited pages', async () => {
    const content = `---
canonical: Test
entity_type: Topic
status: canonical
last_updated: 2026-06-13
---
# Test

<!-- human-edited -->
Some human content.`;

    await fs.writeFile(path.join(wikiDir, 'Test.md'), content);

    const result = await wikiStatus(tempDir);
    expect(result.files[0].humanEdited).toBe(true);
  });
});
