// LLM Provider 接口类型定义

import { OntologySchema } from '../schema/types';

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
 */
export interface LLMProvider {
  recognize(input: RecognizerInput): Promise<RecognizerOutput>;
  inferEntityType?(input: EntityTypeInfoInput): Promise<string>;
}
