import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { wikiWrite } from '../../../src/v3/tools/wiki-write';
import { WikiWriteInput } from '../../../src/v3/tools/types';

describe('wiki-write', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
    await fs.mkdir(path.join(tempDir, 'wiki'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'ontology.yaml'),
      'version: "1.0"\nentity_types:\n  Person:\n    description: 人物\n  Event:\n    description: 事件\n'
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should create new wiki page', async () => {
    const input: WikiWriteInput = {
      projectPath: tempDir,
      canonical: 'John Doe',
      type: 'Person',
      content: 'Test content',
      sources: [{ file: 'raw/test.md', line: 1 }],
      isUpdate: false,
    };

    const result = await wikiWrite(input);
    expect(result.success).toBe(true);
    expect(result.created).toBe(true);

    const content = await fs.readFile(result.path, 'utf-8');
    expect(content).toContain('canonical: John Doe');
    expect(content).toContain('entity_type: Person');
  });

  it('should fail if file exists on create', async () => {
    const personsDir = path.join(tempDir, 'wiki', 'Persons');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(path.join(personsDir, 'John_Doe.md'), 'existing');

    const input: WikiWriteInput = {
      projectPath: tempDir,
      canonical: 'John Doe',
      type: 'Person',
      content: 'New',
      sources: [{ file: 'raw/test.md', line: 1 }],
      isUpdate: false,
    };

    await expect(wikiWrite(input)).rejects.toThrow('already exists');
  });

  it('should update existing page', async () => {
    const personsDir = path.join(tempDir, 'wiki', 'Persons');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(
      path.join(personsDir, 'John_Doe.md'),
      '---\ncanonical: John Doe\nentity_type: Person\nsources: []\n---\n# John Doe\n\nOriginal.'
    );

    const input: WikiWriteInput = {
      projectPath: tempDir,
      canonical: 'John Doe',
      type: 'Person',
      content: 'Updated',
      sources: [{ file: 'raw/test.md', line: 1 }],
      isUpdate: true,
    };

    const result = await wikiWrite(input);
    expect(result.created).toBe(false);

    const content = await fs.readFile(result.path, 'utf-8');
    expect(content).toContain('Original.');
    expect(content).toContain('Updated');
  });

  it('should merge aliases on update', async () => {
    const personsDir = path.join(tempDir, 'wiki', 'Persons');
    await fs.mkdir(personsDir, { recursive: true });
    await fs.writeFile(
      path.join(personsDir, 'John_Doe.md'),
      '---\ncanonical: John Doe\nentity_type: Person\naliases:\n  - Johnny\nsources: []\n---\n# John Doe'
    );

    const input: WikiWriteInput = {
      projectPath: tempDir,
      canonical: 'John Doe',
      type: 'Person',
      aliases: ['John', 'Mr. Doe'],
      content: 'Updated',
      sources: [{ file: 'raw/test.md', line: 1 }],
      isUpdate: true,
    };

    const result = await wikiWrite(input);
    const content = await fs.readFile(result.path, 'utf-8');
    expect(content).toContain('Johnny');
    expect(content).toContain('John');
    expect(content).toContain('Mr. Doe');
  });

  it('should throw for unknown entity type', async () => {
    const input: WikiWriteInput = {
      projectPath: tempDir,
      canonical: 'Test',
      type: 'Unknown',
      content: 'Test',
      sources: [{ file: 'raw/test.md', line: 1 }],
      isUpdate: false,
    };

    await expect(wikiWrite(input)).rejects.toThrow('Unknown entity type');
  });
});