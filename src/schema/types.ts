// Schema 类型定义

/**
 * 模板信息字段定义
 */
export interface TemplateInfoField {
  key: string;
}

/**
 * 实体类型模板定义
 */
export interface EntityTemplate {
  summary: string;
  info: TemplateInfoField[];
  sources: string;
  related: string;
  updated: string;
}

/**
 * 实体类型定义
 */
export interface EntityTypeDefinition {
  description: string;
  template?: EntityTemplate;
}

/**
 * 关系定义
 */
export interface RelationDefinition {
  from: string;
  to: string;
}

/**
 * 本体 Schema 结构
 */
export interface OntologySchema {
  version: string;
  entity_types: Record<string, EntityTypeDefinition>;
  relations?: Record<string, RelationDefinition>;
}

/**
 * Schema 加载结果
 */
export interface SchemaLoadResult {
  schema: OntologySchema;
  source: 'root' | 'hidden' | 'home' | 'default';
  filePath?: string;
}
