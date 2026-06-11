import * as fs from 'fs/promises';
import * as path from 'path';
import { CacheData } from './types';
import { md5 } from '../utils/md5';

export class HashCache {
  private cachePath: string;

  constructor(cachePath: string) {
    this.cachePath = cachePath;
  }

  async load(): Promise<CacheData> {
    try {
      const content = await fs.readFile(this.cachePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {
        schemaHash: '',
        fileHashes: {},
      };
    }
  }

  async save(data: CacheData): Promise<void> {
    const dir = path.dirname(this.cachePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.cachePath, JSON.stringify(data, null, 2));
  }

  needsEnhancement(
    filePath: string,
    currentFileHash: string,
    currentSchemaHash: string,
    cache: CacheData
  ): boolean {
    const cached = cache.fileHashes[filePath];

    if (!cached) return true;

    if (cached.fileHash !== currentFileHash) return true;

    if (cache.schemaHash !== currentSchemaHash) return true;

    const combinedHash = md5(currentSchemaHash + currentFileHash);
    if (cached.combinedHash !== combinedHash) return true;

    return false;
  }

  updateFileHash(
    cache: CacheData,
    filePath: string,
    fileHash: string,
    schemaHash: string,
    enhanced: boolean
  ): void {
    const combinedHash = md5(schemaHash + fileHash);
    cache.fileHashes[filePath] = {
      fileHash,
      combinedHash,
      enhanced,
    };
  }

  updateSchemaHash(cache: CacheData, schemaHash: string): void {
    cache.schemaHash = schemaHash;
  }
}
