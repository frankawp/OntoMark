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
import { EntityExtractor } from './extract/entity-extractor';
import { EntityMerger } from './extract/entity-merger';
import { WikiPageBuilder } from './extract/wiki-page-builder';
import { WikiIndexBuilder } from './wiki/index-builder';
import { md5 } from './utils/md5';

/**
 * V2 API 配置选项
 */
export interface OntoMarkOptions {
  /** 源文档目录（V2 API） */
  rawPath?: string;
  /** Wiki 输出目录（V2 API） */
  wikiPath?: string;
  /** LLM Provider */
  llmProvider: LLMProvider;
  /** Schema 路径（可选） */
  schemaPath?: string;
  /** @deprecated 使用 rawPath 和 wikiPath 替代 */
  vaultPath?: string;
}

/**
 * V2 API 构建结果
 */
export interface BuildResult {
  /** 提取成功数 */
  extractSuccess: number;
  /** 提取失败数 */
  extractFailed: number;
  /** 链接成功数 */
  linkSuccess: number;
  /** 链接失败数 */
  linkFailed: number;
  /** 生成的 wiki 页面数 */
  wikiPages: number;
}

/**
 * V1 API 批量结果（向后兼容）
 */
export interface BatchResult {
  success: string[];
  failed: Array<{
    filePath: string;
    error: Error;
  }>;
}

/**
 * 状态查询结果
 */
export interface StatusResult {
  totalFiles: number;
  indexedFiles: number;
  pendingFiles: number;
  schemaHash: string;
}

/**
 * OntoMark 主类
 *
 * 支持两种使用方式：
 *
 * V2 API (推荐)：
 * ```typescript
 * const ontomark = new OntoMark({
 *   rawPath: './raw',
 *   wikiPath: './wiki',
 *   llmProvider: provider,
 * });
 * await ontomark.build();
 * ```
 *
 * V1 API (向后兼容)：
 * ```typescript
 * const ontomark = new OntoMark({
 *   vaultPath: './vault',
 *   llmProvider: provider,
 * });
 * await ontomark.enhanceAll();
 * ```
 */
export class OntoMark {
  // V2 路径
  private rawPath?: string;
  private wikiPath?: string;

  // V1 路径（向后兼容）
  private vaultPath?: string;

  // 共享配置
  private llmProvider: LLMProvider;
  private schemaPath?: string;
  private schema?: OntologySchema;

  // V1 内部状态
  private index?: EntityIndex;
  private cache?: CacheData;
  private cachePath?: string;

  constructor(options: OntoMarkOptions) {
    this.llmProvider = options.llmProvider;
    this.schemaPath = options.schemaPath;

    // V2 API 模式
    if (options.rawPath && options.wikiPath) {
      this.rawPath = path.resolve(options.rawPath);
      this.wikiPath = path.resolve(options.wikiPath);
    }
    // V1 API 向后兼容
    else if (options.vaultPath) {
      this.vaultPath = path.resolve(options.vaultPath);
      // 自动推断 raw/wiki 路径
      this.rawPath = path.join(this.vaultPath, 'raw');
      this.wikiPath = path.join(this.vaultPath, 'wiki');
      this.cachePath = path.join(this.vaultPath, '.ontomark', 'cache.json');
    }
    else {
      throw new Error('必须提供 rawPath 和 wikiPath，或提供 vaultPath（向后兼容模式）');
    }
  }

  // ============== V2 API ==============

  /**
   * 从 raw 目录提取实体，生成 wiki 页面
   */
  async extract(options?: { force?: boolean }): Promise<BuildResult> {
    await this.ensureSchema();
    await this.ensureDirectories();

    const result: BuildResult = {
      extractSuccess: 0,
      extractFailed: 0,
      linkSuccess: 0,
      linkFailed: 0,
      wikiPages: 0,
    };

    const extractor = new EntityExtractor(this.schema!, this.llmProvider);
    const merger = new EntityMerger();
    const pageBuilder = new WikiPageBuilder(this.schema!);

    // 扫描 raw 目录
    const rawFiles = await this.scanRawFiles();

    // 提取所有文档的实体
    const allMentions: any[] = [];
    for (const rawFile of rawFiles) {
      try {
        const extractResult = await extractor.extract(rawFile);
        if (extractResult.processed) {
          allMentions.push(...extractResult.entities);
          result.extractSuccess++;
        } else {
          result.extractFailed++;
        }
      } catch (error) {
        result.extractFailed++;
      }
    }

    // 合并实体
    const mergedEntities = merger.merge(allMentions);

    // 生成 wiki 页面
    for (const [name, merged] of mergedEntities) {
      try {
        const page = await pageBuilder.build(merged);
        const wikiFilePath = path.join(this.wikiPath!, page.filePath);
        await fs.writeFile(wikiFilePath, page.content, 'utf-8');
        result.wikiPages++;
      } catch (error) {
        // 页面生成失败
      }
    }

    // 生成索引
    if (result.wikiPages > 0) {
      const indexBuilder = new WikiIndexBuilder(this.wikiPath!);
      await indexBuilder.writeIndexFile();
    }

    return result;
  }

  /**
   * 在 wiki 目录内生成实体链接
   */
  async link(options?: { force?: boolean }): Promise<BuildResult> {
    await this.ensureSchema();
    await this.ensureDirectories();

    const result: BuildResult = {
      extractSuccess: 0,
      extractFailed: 0,
      linkSuccess: 0,
      linkFailed: 0,
      wikiPages: 0,
    };

    // 构建 wiki 索引
    const wikiIndex = await this.buildWikiIndex();

    // 扫描 wiki 文件
    const wikiFiles = await this.scanWikiFiles();

    // 使用 DocumentEnhancer 处理每个 wiki 文件
    const enhancer = new DocumentEnhancer(
      this.wikiPath!,
      this.schema!,
      wikiIndex,
      this.llmProvider
    );

    for (const wikiFile of wikiFiles) {
      try {
        await enhancer.enhance(wikiFile);
        result.linkSuccess++;
      } catch (error) {
        result.linkFailed++;
      }
    }

    return result;
  }

  /**
   * 完整构建流程：extract + link
   */
  async build(options?: { force?: boolean }): Promise<BuildResult> {
    // 先执行提取
    const extractResult = await this.extract(options);

    // 再执行链接
    const linkResult = await this.link(options);

    return {
      extractSuccess: extractResult.extractSuccess,
      extractFailed: extractResult.extractFailed,
      linkSuccess: linkResult.linkSuccess,
      linkFailed: linkResult.linkFailed,
      wikiPages: extractResult.wikiPages,
    };
  }

  /**
   * 获取当前状态
   *
   * V1 模式：返回 vault 内的文件状态
   * V2 模式：返回 raw 和 wiki 的文件状态
   */
  async getStatus(): Promise<StatusResult & { rawFiles?: number; wikiFiles?: number }> {
    // V1 模式：使用 VaultScanner
    if (this.vaultPath) {
      const scanner = new VaultScanner(this.vaultPath);
      const files = await scanner.scan();
      const hashCache = new HashCache(this.cachePath!);
      const cache = await hashCache.load();

      const pendingFiles = files.filter(file => {
        const relativePath = path.relative(this.vaultPath!, file);
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

    // V2 模式
    await this.ensureSchema();

    const rawFiles = await this.scanRawFiles();
    const wikiFiles = await this.scanWikiFiles();

    return {
      totalFiles: rawFiles.length,
      indexedFiles: wikiFiles.length,
      pendingFiles: Math.max(0, rawFiles.length - wikiFiles.length),
      schemaHash: md5(JSON.stringify(this.schema)),
      rawFiles: rawFiles.length,
      wikiFiles: wikiFiles.length,
    };
  }

  // ============== V1 API (向后兼容) ==============

  /**
   * @deprecated 使用 build() 替代
   */
  async buildIndex(): Promise<EntityIndex> {
    if (!this.vaultPath) {
      throw new Error('V1 API 需要 vaultPath');
    }

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
    const hashCache = new HashCache(this.cachePath!);
    this.cache = await hashCache.load();

    // 更新 schema hash
    const schemaHash = md5(JSON.stringify(this.schema));
    hashCache.updateSchemaHash(this.cache, schemaHash);

    return this.index;
  }

  /**
   * @deprecated 使用 link() 替代
   */
  async enhanceFile(filePath: string): Promise<EnhanceResult> {
    if (!this.schema || !this.index) {
      await this.buildIndex();
    }

    const enhancer = new DocumentEnhancer(
      this.vaultPath!,
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

  /**
   * @deprecated 使用 build() 替代
   */
  async enhanceAll(options?: { dryRun?: boolean; force?: boolean }): Promise<BatchResult> {
    if (!this.schema || !this.index || !this.cache) {
      await this.buildIndex();
    }

    const result: BatchResult = { success: [], failed: [] };
    const hashCache = new HashCache(this.cachePath!);
    const scanner = new VaultScanner(this.vaultPath!);
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

  // ============== 私有辅助方法 ==============

  private async ensureSchema(): Promise<void> {
    if (this.schema) return;

    const schemaLoader = new SchemaLoader();

    // 尝试从多个位置加载 schema
    if (this.schemaPath) {
      const result = await schemaLoader.load(this.schemaPath);
      this.schema = result.schema;
    } else if (this.wikiPath) {
      const result = await schemaLoader.loadWithFallback(this.wikiPath);
      this.schema = result.schema;
    } else if (this.vaultPath) {
      const result = await schemaLoader.loadWithFallback(this.vaultPath);
      this.schema = result.schema;
    }
  }

  private async ensureDirectories(): Promise<void> {
    // 确保 wiki 目录存在
    if (this.wikiPath) {
      await fs.mkdir(this.wikiPath, { recursive: true });
    }
  }

  private async scanRawFiles(): Promise<string[]> {
    if (!this.rawPath) return [];

    const files: string[] = [];
    try {
      const entries = await fs.readdir(this.rawPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(path.join(this.rawPath, entry.name));
        }
      }
    } catch (error) {
      // 目录不存在或读取失败
    }

    return files;
  }

  private async scanWikiFiles(): Promise<string[]> {
    if (!this.wikiPath) return [];

    const files: string[] = [];
    try {
      const entries = await fs.readdir(this.wikiPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md') {
          files.push(path.join(this.wikiPath, entry.name));
        }
      }
    } catch (error) {
      // 目录不存在或读取失败
    }

    return files;
  }

  private async buildWikiIndex(): Promise<EntityIndex> {
    const wikiFiles = await this.scanWikiFiles();

    // 简单实现：从 wiki 文件名构建索引
    const index: EntityIndex = {
      entities: new Map(),
      aliasIndex: new Map(),
      headingIndex: new Map(),
      blockIndex: new Map(),
    };

    for (const file of wikiFiles) {
      const fileName = path.basename(file, '.md');
      index.entities.set(fileName, {
        fileName,
        filePath: file,
        entityType: 'Concept', // 默认类型
        aliases: [],
        headings: [],
        blocks: [],
        fileHash: '',
      });
      index.aliasIndex.set(fileName.toLowerCase(), [fileName]);
    }

    return index;
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
