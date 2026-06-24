/**
 * V3 工具共享类型定义
 */

// ============ 处理状态 ============

export interface PendingFilesResult {
  /** 需要处理的 raw 文件列表（相对路径） */
  files: string[];
  total: number;
  /** ontology 文件是否在此批次中有变更 */
  ontologyChanged: boolean;
  /** 当前记录的 lastProcessedHash */
  lastHash: string;
}

// ============ Wiki 状态 ============

export interface WikiFileInfo {
  path: string;
  canonical: string;
  type: string;
  lastModified: string;
  humanEdited: boolean;
}

export interface WikiStatusResult {
  files: WikiFileInfo[];
  total: number;
}

// ============ 索引 ============

export interface IndexQueryResult {
  found: boolean;
  canonical?: string;
  type?: string;
  path?: string;
  aliases?: string[];
}

export interface IndexEntity {
  canonical: string;
  type: string;
  path: string;
  aliases: string[];
}

export interface IndexData {
  entities: Record<string, IndexEntity>;
  aliases: Record<string, string>;
}

// ============ Lint ============

export interface LintOrphansResult {
  orphans: string[];
}

export interface MissingLink {
  entity: string;
  referencedBy: string[];
}

export interface LintMissingResult {
  missing: MissingLink[];
}

export interface LintAllResult {
  orphans: string[];
  missing: MissingLink[];
  empty: string[];
  totalIssues: number;
}

// ============ 处理状态存储 ============

export interface ProcessedData {
  /** 上次处理的 git commit hash */
  lastProcessedHash?: string;
  /** 上次处理时间 */
  lastProcessedAt?: string;
}