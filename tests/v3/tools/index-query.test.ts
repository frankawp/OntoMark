import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { indexQuery } from '../../../src/v3/tools/index-query';
import { IndexData } from '../../../src/v3/tools/types';

describe('index-query', () => {
  let tempDir: string;
  let ontomarkDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
    ontomarkDir = path.join(tempDir, '.ontomark');
    await fs.mkdir(ontomarkDir, { recursive: true });

    const indexData: IndexData = {
      entities: {
        'John Doe': { canonical: 'John Doe', type: 'Person', path: 'Persons/John_Doe.md', aliases: ['Johnny', 'JD'] },
        'Jane Doe': { canonical: 'Jane Doe', type: 'Person', path: 'Persons/Jane_Doe.md', aliases: [] },
      },
      aliases: { Johnny: 'John Doe', JD: 'John Doe' },
    };
    await fs.writeFile(path.join(ontomarkDir, 'index.json'), JSON.stringify(indexData, null, 2));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should find entity by canonical name', async () => {
    const result = await indexQuery(tempDir, 'John Doe');
    expect(result.found).toBe(true);
    expect(result.canonical).toBe('John Doe');
    expect(result.type).toBe('Person');
  });

  it('should find entity by alias', async () => {
    const result = await indexQuery(tempDir, 'Johnny');
    expect(result.found).toBe(true);
    expect(result.canonical).toBe('John Doe');
  });

  it('should return not found for unknown name', async () => {
    const result = await indexQuery(tempDir, 'Unknown Person');
    expect(result.found).toBe(false);
  });

  it('should return aliases for found entity', async () => {
    const result = await indexQuery(tempDir, 'John Doe');
    expect(result.aliases).toContain('Johnny');
    expect(result.aliases).toContain('JD');
  });

  it('should handle missing index file', async () => {
    await fs.rm(path.join(ontomarkDir, 'index.json'));
    const result = await indexQuery(tempDir, 'John Doe');
    expect(result.found).toBe(false);
  });
});
