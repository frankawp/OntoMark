import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { rawStatus } from '../../../src/v3/tools/raw-status';

describe('raw-status', () => {
  let tempDir: string;
  let rawDir: string;
  let ontomarkDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
    rawDir = path.join(tempDir, 'raw');
    ontomarkDir = path.join(tempDir, '.ontomark');
    await fs.mkdir(rawDir, { recursive: true });
    await fs.mkdir(ontomarkDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty when no raw files', async () => {
    const result = await rawStatus(tempDir);
    expect(result.total).toBe(0);
    expect(result.pending).toBe(0);
    expect(result.files).toEqual([]);
  });

  it('should list all raw markdown files', async () => {
    await fs.writeFile(path.join(rawDir, 'test1.md'), 'content1');
    await fs.writeFile(path.join(rawDir, 'test2.md'), 'content2');
    await fs.writeFile(path.join(rawDir, 'ignore.txt'), 'ignored');

    const result = await rawStatus(tempDir);
    expect(result.total).toBe(2);
    expect(result.files.map(f => f.path)).toContain('raw/test1.md');
    expect(result.files.map(f => f.path)).toContain('raw/test2.md');
  });

  it('should detect unprocessed files', async () => {
    await fs.writeFile(path.join(rawDir, 'new.md'), 'new content');

    const result = await rawStatus(tempDir);
    expect(result.pending).toBe(1);
    expect(result.files[0].modified).toBe(true);
  });

  it('should detect modified files', async () => {
    await fs.writeFile(path.join(rawDir, 'existing.md'), 'original');
    await fs.writeFile(
      path.join(ontomarkDir, 'processed.json'),
      JSON.stringify({
        files: {
          'raw/existing.md': {
            lastProcessed: '2026-06-12T00:00:00Z',
            hash: 'wronghash',
          },
        },
      })
    );

    const result = await rawStatus(tempDir);
    expect(result.pending).toBe(1);
    expect(result.files.find(f => f.path === 'raw/existing.md')?.modified).toBe(true);
  });

  it('should not mark unchanged files as pending', async () => {
    const content = 'unchanged content';
    const hash = crypto.createHash('md5').update(content).digest('hex');
    await fs.writeFile(path.join(rawDir, 'stable.md'), content);
    await fs.writeFile(
      path.join(ontomarkDir, 'processed.json'),
      JSON.stringify({
        files: {
          'raw/stable.md': {
            lastProcessed: '2026-06-12T00:00:00Z',
            hash,
          },
        },
      })
    );

    const result = await rawStatus(tempDir);
    expect(result.pending).toBe(0);
    expect(result.files.find(f => f.path === 'raw/stable.md')?.modified).toBe(false);
  });
});
