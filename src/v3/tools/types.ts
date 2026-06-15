/**
 * V3 工具共享类型定义
 */

// ============ 处理状态 ============

export interface ProcessedFile {
  path: string;
  lastProcessed?: string;
  hash: string;
  modified: boolean;
}

export interface RawStatusResult {
  files: ProcessedFile[];
  total: number;
  pending: number;
  ontologyChanged?: boolean;
  ontologyHash?: string;
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
}

export interface WikiWriteInput {
  projectPath: string;
  entities: WikiWriteEntity[];
}

export interface WikiWriteItemResult {
  canonical: string;
  success: boolean;
  path?: string;
  error?: string;
}

export interface WikiWriteResult {
  total: number;
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
  ontologyHash?: string;  // ontology.yaml 的 hash
  files: Record<string, {
    lastProcessed: string;
    hash: string;
  }>;
}