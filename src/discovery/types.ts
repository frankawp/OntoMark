// src/discovery/types.ts

import { EntityRelation } from '../llm/types';

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
  /** 上下文片段（完整描述，用于消歧和摘要） */
  context: string[];
  /** 置信度 0-1 */
  confidence: number;
  /** 结构化信息 */
  info?: Record<string, string>;
  /** 实体关系 */
  relations?: EntityRelation[];
  /** 位置信息 */
  location: {
    file: string;
    line: number;
    text: string;
  };
}

/**
 * 事件提及
 */
export interface EventMention {
  /** 事件名称 */
  name: string;
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
  /** 上下文 */
  context: string[];
  /** 置信度 */
  confidence: number;
  /** 位置信息 */
  locationInfo: {
    file: string;
    line: number;
  };
}

/**
 * 声明提及
 */
export interface StatementMention {
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
  /** 位置信息 */
  locationInfo: {
    file: string;
    line: number;
  };
}

/**
 * 提取结果（增强版）
 */
export interface ExtractionResult {
  entities: EntityMention[];
  events: EventMention[];
  statements: StatementMention[];
  summary?: string;
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
  /** 上下文片段（完整描述） */
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
  /** 结构化信息（合并后） */
  info?: Record<string, string>;
  /** 实体关系 */
  relations?: EntityRelation[];
}

/**
 * 消歧后的事件
 */
export interface ResolvedEvent {
  /** 事件名称 */
  name: string;
  /** 发生日期 */
  date?: string;
  /** 发生地点 */
  location?: string;
  /** 参与者 */
  participants?: string[];
  /** 事件描述（合并后） */
  description: string;
  /** 结果/影响 */
  outcome?: string;
  /** 来源证据 */
  sources: Evidence[];
  /** 置信度 */
  confidence: number;
  /** 是否需要审核 */
  needsReview: boolean;
}

/**
 * 消歧后的声明
 */
export interface ResolvedStatement {
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
  /** 来源证据 */
  sources: Evidence[];
  /** 置信度 */
  confidence: number;
  /** 是否需要审核 */
  needsReview: boolean;
}

/**
 * 消歧结果（增强版）
 */
export interface ResolutionResult {
  /** 成功消歧的实体 */
  resolved: ResolvedEntity[];
  /** 需要审核的实体 */
  needsReview: ResolvedEntity[];
  /** 消歧后的事件 */
  events: ResolvedEvent[];
  /** 消歧后的声明 */
  statements: ResolvedStatement[];
  /** 冲突详情 */
  conflicts: Array<{
    name: string;
    candidates: EntityMention[];
  }>;
}