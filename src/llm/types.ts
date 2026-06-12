// LLM Provider 接口类型定义

import { OntologySchema } from '../schema/types';
import { ExtractionInput, ExtractionOutput } from '../extract/types';

// ============== V2 接口 ==============

/**
 * 实体提取结果
 */
export interface ExtractionResult {
  entities: EntityExtraction[];
}

/**
 * 单个实体提取
 */
export interface EntityExtraction {
  /** 实体名称 */
  name: string;
  /** 别名列表 */
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
 * 分类结果
 */
export interface ClassificationResult {
  /** 分类类型 */
  type: string;
  /** 置信度 */
  confidence: number;
}

/**
 * AIProvider 统一接口（V2）
 */
export interface AIProvider {
  /** 从文本中提取实体 */
  extract(text: string, schema: OntologySchema): Promise<ExtractionResult>;
  /** 对文本进行分类 */
  classify(text: string, types: string[]): Promise<ClassificationResult>;
  /** 生成文本 */
  generate(prompt: string, context: string): Promise<string>;
  /** 检查服务是否可用 */
  isAvailable(): Promise<boolean>;
}

/**
 * AIProvider 配置
 */
export interface AIProviderConfig {
  /** API 密钥 */
  apiKey: string;
  /** 模型名称（可选） */
  model?: string;
  /** API 基础 URL（可选） */
  baseURL?: string;
}

// ============== V1 接口（向后兼容）=============

/**
 * 实体识别输入
 */
export interface RecognizerInput {
  content: string;
  schema: OntologySchema;
  existingEntities: string[];
}

/**
 * 实体识别输出
 */
export interface RecognizerOutput {
  entities: Array<{
    text: string;
    entityType?: string;
    confidence: number;
  }>;
}

/**
 * 实体类型推断输入
 */
export interface EntityTypeInfoInput {
  fileName: string;
  content: string;
  schema: OntologySchema;
}

/**
 * LLM Provider 接口
 * @deprecated 使用 AIProvider 替代
 */
export interface LLMProvider {
  recognize(input: RecognizerInput): Promise<RecognizerOutput>;
  inferEntityType?(input: EntityTypeInfoInput): Promise<string>;
  extract?(input: ExtractionInput): Promise<ExtractionOutput>;
}
