/**
 * storage/cache.ts - 实体缓存类型定义（临时最小实现）
 *
 * 用于存储实体和别名的缓存结构
 */

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
