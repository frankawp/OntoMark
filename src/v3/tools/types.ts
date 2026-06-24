/**
 * V3 工具共享类型定义
 */

// ============ 处理状态 ============

export interface PendingFilesResult {
  /** 需要处理的 raw 文件列表（相对路径） */
  files: string[];
  total: number;
  /** ontology.yaml 是否在此批次中有变更 */
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

// ============ Ontology 状态 ============

export interface EntityTypeDef {
  description: string;
  template?: {
    summary?: string;
    info?: Array<{ key: string; label?: string }>;
  };
}

export interface OntologyStatusResult {
  exists: boolean;
  path: string;
  hash: string;
  lastModified: string;
  entityTypes: Record<string, EntityTypeDef>;
}

// ============ Wiki 写入 ============

/**
 * 来源引用 - 支持字符串或对象格式
 * 字符串格式: "raw/file.md"
 * 对象格式: { file: "raw/file.md", lines: [1, 5] }
 */
export type SourceRef = string | { file: string; lines?: number[] };

export interface WikiWriteEntity {
  canonical: string;
  type: string;
  aliases?: string[];
  info?: Record<string, string>;
  content: string;
  sources: SourceRef[];
  needsReview?: boolean;
  isUpdate: boolean;
}

export interface WikiWriteInput {
  projectPath: string;
  entities: WikiWriteEntity[];
}

export interface WikiWriteItemResult {
  canonical: string;
  success: boolean;
  path?: string;
  action: 'created' | 'updated';
  error?: string;
}

export interface WikiWriteResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  results: WikiWriteItemResult[];
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