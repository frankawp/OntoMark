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

export interface SourceRef {
  file: string;
  line: number;
}

export interface WikiWriteInput {
  projectPath: string;
  canonical: string;
  type: string;
  aliases?: string[];
  info?: Record<string, string>;
  content: string;
  sources: SourceRef[];
  needsReview?: boolean;
  isUpdate: boolean;
}

export interface WikiWriteResult {
  success: boolean;
  path: string;
  created: boolean;
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
  files: Record<string, {
    lastProcessed: string;
    hash: string;
  }>;
}