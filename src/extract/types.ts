import { OntologySchema } from '../schema/types';

/**
 * 实体提及信息
 */
export interface EntityMention {
  /** 实体名称 */
  name: string;
  /** 别名 */
  aliases: string[];
  /** 实体类型 */
  type: string;
  /** 上下文片段 */
  context: string[];
  /** 置信度 */
  confidence: number;
  /** 提取的关键信息 */
  info?: Record<string, string>;
}

/**
 * 提取选项
 */
export interface ExtractOptions {
  /** 是否强制重新处理 */
  force?: boolean;
  /** 是否 dry run */
  dryRun?: boolean;
}

/**
 * 单个文档的提取结果
 */
export interface ExtractResult {
  /** 源文档路径 */
  rawPath: string;
  /** 提取的实体列表 */
  entities: EntityMention[];
  /** 是否已处理 */
  processed: boolean;
}

/**
 * 批量提取结果
 */
export interface BatchExtractResult {
  /** 成功处理的文档 */
  success: string[];
  /** 处理失败的文档 */
  failed: Array<{
    rawPath: string;
    error: Error;
  }>;
  /** 生成的 wiki 页面 */
  wikiPages: string[];
}

/**
 * LLM 信息提取输入
 */
export interface ExtractionInput {
  /** 文档内容 */
  content: string;
  /** Schema */
  schema: OntologySchema;
  /** 文档文件名 */
  fileName: string;
}

/**
 * LLM 信息提取输出
 */
export interface ExtractionOutput {
  /** 提取的实体 */
  entities: EntityMention[];
}
