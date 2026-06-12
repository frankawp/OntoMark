// LLM Provider 接口类型定义

import { OntologySchema } from '../schema/types';

// ============== V2 增强接口 ==============

/**
 * 实体关系
 */
export interface EntityRelation {
  /** 关系类型 */
  type: string;
  /** 目标实体 */
  target: string;
  /** 置信度 */
  confidence: number;
}

/**
 * 单个实体提取（增强版）
 */
export interface EntityExtraction {
  /** 实体名称（规范形式） */
  name: string;
  /** 别名列表 */
  aliases: string[];
  /** 实体类型 */
  type: string;
  /** 完整上下文（保留原始描述） */
  context: string[];
  /** 置信度 */
  confidence: number;
  /** 结构化信息 */
  info?: Record<string, string>;
  /** 实体关系 */
  relations?: EntityRelation[];
}

/**
 * 事件提取
 */
export interface EventExtraction {
  /** 事件名称 */
  name: string;
  /** 事件类型 */
  type: 'Event';
  /** 发生日期 */
  date?: string;
  /** 发生地点 */
  location?: string;
  /** 参与者 */
  participants?: string[];
  /** 事件描述 */
  description: string;
  /** 结果/影响 */
  outcome?: string;
  /** 来源上下文 */
  context: string[];
  /** 置信度 */
  confidence: number;
}

/**
 * 声明提取
 */
export interface StatementExtraction {
  /** 声明摘要 */
  summary: string;
  /** 发言人 */
  speaker: string;
  /** 发言人角色 */
  speakerRole?: string;
  /** 发表日期 */
  date?: string;
  /** 完整内容 */
  content: string;
  /** 背景 */
  context: string;
  /** 置信度 */
  confidence: number;
}

/**
 * LLM 层提取结果（增强版）
 */
export interface LLMExtractionResult {
  /** 提取的实体 */
  entities: EntityExtraction[];
  /** 提取的事件 */
  events?: EventExtraction[];
  /** 提取的声明 */
  statements?: StatementExtraction[];
  /** 文档摘要 */
  summary?: string;
}

/**
 * 分类结果
 */
export interface ClassificationResult {
  type: string;
  confidence: number;
}

/**
 * AIProvider 统一接口（V2）
 */
export interface AIProvider {
  /** 从文本中提取实体、事件、关系 */
  extract(text: string, schema: OntologySchema): Promise<LLMExtractionResult>;
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
  apiKey: string;
  model?: string;
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
}
