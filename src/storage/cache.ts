/**
 * storage/cache.ts - 实体缓存管理
 *
 * 用于存储实体和别名的缓存结构，支持 JSON 持久化
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 缓存的实体信息
 */
export interface CachedEntity {
  /** 实体名称 */
  name: string;
  /** 实体类型 */
  entityType: string;
  /** 来源信息 */
  sources: any[];
  /** Wiki 页面路径 */
  wikiPagePath: string;
  /** 实体哈希值 */
  hash: string;
}

/**
 * 实体缓存结构
 */
export interface EntityCache {
  /** 实体名称到实体信息的映射 */
  entities: Map<string, CachedEntity>;
  /** 别名到规范名称的映射 */
  aliases: Map<string, string>;
  /** 最后扫描时间 */
  lastScan: string;
  /** Schema 哈希值 */
  schemaHash: string;
}

/**
 * 缓存文件接口（JSON 序列化格式）
 */
interface CacheFile {
  entities: Record<string, CachedEntity>;
  aliases: Record<string, string>;
  lastScan: string;
  schemaHash: string;
}

/**
 * 原始文件信息（用于重建检查）
 */
export interface RawFileInfo {
  /** 文件路径 */
  path: string;
  /** 文件哈希值 */
  hash: string;
}

/**
 * CacheManager - 缓存管理器
 *
 * 负责实体缓存的加载、保存、失效等操作
 */
export class CacheManager {
  private readonly cacheDir: string;
  private readonly cacheFilePath: string;

  /**
   * 构造函数
   * @param cacheDir 缓存目录路径
   */
  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.cacheFilePath = path.join(cacheDir, 'entities.json');
  }

  /**
   * 加载缓存
   * @returns EntityCache 实体缓存
   */
  async load(): Promise<EntityCache> {
    try {
      const content = await fs.readFile(this.cacheFilePath, 'utf-8');
      const data: CacheFile = JSON.parse(content);

      return {
        entities: new Map(Object.entries(data.entities || {})),
        aliases: new Map(Object.entries(data.aliases || {})),
        lastScan: data.lastScan || '',
        schemaHash: data.schemaHash || '',
      };
    } catch (error) {
      // 文件不存在或其他错误，返回空缓存
      return {
        entities: new Map(),
        aliases: new Map(),
        lastScan: '',
        schemaHash: '',
      };
    }
  }

  /**
   * 保存缓存
   * @param cache 实体缓存
   */
  async save(cache: EntityCache): Promise<void> {
    // 确保缓存目录存在
    await fs.mkdir(this.cacheDir, { recursive: true });

    const data: CacheFile = {
      entities: Object.fromEntries(cache.entities),
      aliases: Object.fromEntries(cache.aliases),
      lastScan: cache.lastScan,
      schemaHash: cache.schemaHash,
    };

    await fs.writeFile(this.cacheFilePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * 失效实体
   * @param entityName 可选的实体名称，不提供则失效所有实体
   */
  async invalidate(entityName?: string): Promise<void> {
    const cache = await this.load();

    if (entityName) {
      // 失效特定实体
      cache.entities.delete(entityName);

      // 移除指向该实体的别名
      for (const [alias, canonical] of cache.aliases) {
        if (canonical === entityName) {
          cache.aliases.delete(alias);
        }
      }
    } else {
      // 失效所有实体
      cache.entities.clear();
      cache.aliases.clear();
    }

    await this.save(cache);
  }

  /**
   * 检查文件是否已被缓存
   * @param filePath 文件路径
   * @returns 是否已在缓存中
   */
  async isCached(filePath: string): Promise<boolean> {
    const cache = await this.load();

    // 检查是否有任何实体使用了该文件作为来源
    for (const entity of cache.entities.values()) {
      for (const source of entity.sources) {
        const sourcePath = source.path || source.file;
        if (sourcePath === filePath) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 检查是否需要重建
   * @param rawFile 原始文件信息
   * @returns 是否需要重建
   */
  async needsRebuild(rawFile: RawFileInfo): Promise<boolean> {
    const cache = await this.load();

    let foundMatchingSource = false;

    // 检查所有使用该文件作为来源的实体
    for (const entity of cache.entities.values()) {
      for (const source of entity.sources) {
        const sourcePath = source.path || source.file;
        if (sourcePath === rawFile.path) {
          foundMatchingSource = true;
          // 如果任何来源的哈希不匹配，需要重建
          const sourceHash = source.hash || '';
          if (sourceHash !== rawFile.hash) {
            return true;
          }
        }
      }
    }

    // 如果没有找到匹配的来源，说明是新文件或已失效，需要重建
    return !foundMatchingSource;
  }

  /**
   * 添加实体到缓存
   * @param cache 实体缓存
   * @param entity 实体信息
   */
  async addEntity(cache: EntityCache, entity: CachedEntity): Promise<void> {
    cache.entities.set(entity.name, entity);
  }

  /**
   * 添加别名到缓存
   * @param cache 实体缓存
   * @param alias 别名
   * @param canonicalName 规范名称
   */
  async addAlias(cache: EntityCache, alias: string, canonicalName: string): Promise<void> {
    cache.aliases.set(alias, canonicalName);
  }
}