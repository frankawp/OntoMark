// src/discovery/types.ts

/**
 * 实体提及（从文档中提取的原始信息）
 */
export interface EntityMention {
  /** 原始名称 */
  name: string;
  /** 推断的实体类型 */
  entityType: string;
  /** 发现的别名 */
  aliases: string[];
  /** 上下文片段（用于消歧和摘要） */
  context: string;
  /** 置信度 0-1 */
  confidence: number;
  /** 位置信息 */
  location: {
    file: string;
    line: number;
    text: string;
  };
}

/**
 * 提取结果
 */
export interface ExtractionResult {
  entities: EntityMention[];
  metadata: {
    sourceFile: string;
    timestamp: string;
    hash: string;
  };
}

/**
 * 证据（实体来源）
 */
export interface Evidence {
  /** 来源文件 */
  file: string;
  /** 行号 */
  line: number;
  /** 上下文片段 */
  context: string;
  /** 时间戳 */
  timestamp: string;
}

/**
 * 消歧后的实体
 */
export interface ResolvedEntity {
  /** 标准名称 */
  canonicalName: string;
  /** 别名列表 */
  aliases: string[];
  /** 确定的类型 */
  entityType: string;
  /** 来源证据 */
  sources: Evidence[];
  /** 最终置信度 */
  confidence: number;
  /** 是否需要人工审核 */
  needsReview: boolean;
}

/**
 * 消歧结果
 */
export interface ResolutionResult {
  /** 成功消歧的实体 */
  resolved: ResolvedEntity[];
  /** 需要审核的实体 */
  needsReview: ResolvedEntity[];
  /** 冲突详情 */
  conflicts: Array<{
    name: string;
    candidates: EntityMention[];
  }>;
}
