import * as path from 'path';
import * as fs from 'fs/promises';
import { OntologySchema } from './schema/types';
import { EntityIndex, CacheData } from './index/types';
import { LLMProvider } from './llm/types';
import { EnhanceResult } from './enhance/types';
import { SchemaLoader } from './schema/loader';
import { VaultScanner } from './index/scanner';
import { EntityIndexBuilder } from './index/entity-index';
import { HashCache } from './index/hash-cache';
import { DocumentEnhancer } from './enhance/enhancer';
import { md5 } from './utils/md5';

export interface OntoMarkOptions {
  vaultPath: string;
  llmProvider: LLMProvider;
  schemaPath?: string;
}

export interface BatchResult {
  success: string[];
  failed: Array<{
    filePath: string;
    error: Error;
  }>;
}

export interface StatusResult {
  totalFiles: number;
  indexedFiles: number;
  pendingFiles: number;
  schemaHash: string;
}

export class OntoMark {
  private vaultPath: string;
  private llmProvider: LLMProvider;
  private schemaPath?: string;
  private schema?: OntologySchema;
  private index?: EntityIndex;
  private cache?: CacheData;
  private cachePath: string;

  constructor(options: OntoMarkOptions) {
    this.vaultPath = path.resolve(options.vaultPath);
    this.llmProvider = options.llmProvider;
    this.schemaPath = options.schemaPath;
    this.cachePath = path.join(this.vaultPath, '.ontomark', 'cache.json');
  }

  async buildIndex(): Promise<EntityIndex> {
    // 加载 schema
    const schemaLoader = new SchemaLoader();
    const schemaResult = await schemaLoader.loadWithFallback(this.vaultPath);
    this.schema = schemaResult.schema;

    // 扫描 vault
    const scanner = new VaultScanner(this.vaultPath);
    const files = await scanner.scan();

    // 构建索引
    const indexBuilder = new EntityIndexBuilder(this.vaultPath, this.schema);
    this.index = await indexBuilder.build(files);

    // 加载缓存
    const hashCache = new HashCache(this.cachePath);
    this.cache = await hashCache.load();

    // 更新 schema hash
    const schemaHash = md5(JSON.stringify(this.schema));
    hashCache.updateSchemaHash(this.cache, schemaHash);

    return this.index;
  }

  async enhanceFile(filePath: string): Promise<EnhanceResult> {
    if (!this.schema || !this.index) {
      await this.buildIndex();
    }

    const enhancer = new DocumentEnhancer(
      this.vaultPath,
      this.schema!,
      this.index!,
      this.llmProvider
    );

    const result = await enhancer.enhance(path.resolve(filePath));

    // 写入增强后的内容
    if (result.enhanced) {
      await fs.writeFile(filePath, result.content);
    }

    return result;
  }

  async enhanceAll(options?: { dryRun?: boolean; force?: boolean }): Promise<BatchResult> {
    if (!this.schema || !this.index || !this.cache) {
      await this.buildIndex();
    }

    const result: BatchResult = { success: [], failed: [] };
    const hashCache = new HashCache(this.cachePath);
    const scanner = new VaultScanner(this.vaultPath);
    const files = await scanner.scan();

    for (const file of files) {
      try {
        const fileHash = await this.getFileHash(file);
        const schemaHash = md5(JSON.stringify(this.schema));

        if (!options?.force && !hashCache.needsEnhancement(file, fileHash, schemaHash, this.cache!)) {
          continue;
        }

        const enhanceResult = await this.enhanceFile(file);

        if (enhanceResult.enhanced && !options?.dryRun) {
          hashCache.updateFileHash(this.cache!, file, fileHash, schemaHash, true);
        }

        result.success.push(file);
      } catch (error) {
        result.failed.push({
          filePath: file,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // 遇到冲突错误时停止
        if (error instanceof Error && error.name === 'ConflictError') {
          break;
        }
      }
    }

    // 保存缓存
    if (!options?.dryRun) {
      await hashCache.save(this.cache!);
    }

    return result;
  }

  async getStatus(): Promise<StatusResult> {
    const scanner = new VaultScanner(this.vaultPath);
    const files = await scanner.scan();
    const hashCache = new HashCache(this.cachePath);
    const cache = await hashCache.load();

    const pendingFiles = files.filter(file => {
      const relativePath = path.relative(this.vaultPath, file);
      const cached = cache.fileHashes[relativePath];
      return !cached || !cached.enhanced;
    });

    return {
      totalFiles: files.length,
      indexedFiles: this.index?.entities.size || 0,
      pendingFiles: pendingFiles.length,
      schemaHash: cache.schemaHash,
    };
  }

  private async getFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    return md5(content);
  }
}

// 重导出所有类型
export * from './schema/types';
export * from './index/types';
export * from './enhance/types';
export * from './llm/types';
export * from './utils/errors';
export * from './wiki/types';
export * from './extract/types';
export { DeepSeekProvider } from './llm/deepseek-provider';

