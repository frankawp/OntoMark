/**
 * mark-processed 工具测试
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { markProcessed } from '../../../src/v3/tools/mark-processed';

describe('mark-processed', () => {
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

  it('should create processed.json if not exists', async () => {
    await fs.writeFile(path.join(rawDir, 'test.md'), 'content');
    await markProcessed(tempDir, 'raw/test.md');

    const data = JSON.parse(
      await fs.readFile(path.join(ontomarkDir, 'processed.json'), 'utf-8')
    );
    expect(data.files['raw/test.md']).toBeDefined();
    expect(data.files['raw/test.md'].hash).toBe(
      crypto.createHash('md5').update('content').digest('hex')
    );
  });

  it('should update existing processed.json', async () => {
    await fs.writeFile(
      path.join(ontomarkDir, 'processed.json'),
      JSON.stringify({
        files: {
          'raw/old.md': { lastProcessed: '2026-06-12', hash: 'old' },
        },
      })
    );
    await fs.writeFile(path.join(rawDir, 'new.md'), 'new');
    await markProcessed(tempDir, 'raw/new.md');

    const data = JSON.parse(
      await fs.readFile(path.join(ontomarkDir, 'processed.json'), 'utf-8')
    );
    expect(data.files['raw/old.md']).toBeDefined();
    expect(data.files['raw/new.md']).toBeDefined();
    expect(data.files['raw/old.md'].hash).toBe('old');
  });

  it('should calculate correct hash', async () => {
    await fs.writeFile(path.join(rawDir, 'test.md'), 'test content');
    await markProcessed(tempDir, 'raw/test.md');

    const data = JSON.parse(
      await fs.readFile(path.join(ontomarkDir, 'processed.json'), 'utf-8')
    );
    const expectedHash = crypto
      .createHash('md5')
      .update('test content')
      .digest('hex');
    expect(data.files['raw/test.md'].hash).toBe(expectedHash);
  });

  it('should update existing file entry', async () => {
    await fs.writeFile(path.join(rawDir, 'test.md'), 'updated content');
    await fs.writeFile(
      path.join(ontomarkDir, 'processed.json'),
      JSON.stringify({
        files: {
          'raw/test.md': { lastProcessed: '2026-06-12', hash: 'oldhash' },
        },
      })
    );

    await markProcessed(tempDir, 'raw/test.md');

    const data = JSON.parse(
      await fs.readFile(path.join(ontomarkDir, 'processed.json'), 'utf-8')
    );
    const expectedHash = crypto
      .createHash('md5')
      .update('updated content')
      .digest('hex');
    expect(data.files['raw/test.md'].hash).toBe(expectedHash);
    expect(data.files['raw/test.md'].lastProcessed).not.toBe('2026-06-12');
  });

  it('should create .ontomark directory if not exists', async () => {
    const newTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
    await fs.mkdir(path.join(newTempDir, 'raw'), { recursive: true });
    await fs.writeFile(path.join(newTempDir, 'raw', 'test.md'), 'content');

    // .ontomark 目录不存在
    await markProcessed(newTempDir, 'raw/test.md');

    const data = JSON.parse(
      await fs.readFile(path.join(newTempDir, '.ontomark', 'processed.json'), 'utf-8')
    );
    expect(data.files['raw/test.md']).toBeDefined();

    await fs.rm(newTempDir, { recursive: true, force: true });
  });
});
