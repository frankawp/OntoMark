/**
 * OpenAI Provider 实现（增强版）
 * 支持 OpenAI API 和 DeepSeek API（通过 baseURL）
 * 同时提取实体、事件、关系
 */

import OpenAI from 'openai';
import {
  AIProvider,
  AIProviderConfig,
  LLMExtractionResult,
  EntityExtraction,
  EventExtraction,
  StatementExtraction,
  ClassificationResult,
} from './types';
import { OntologySchema } from '../schema/types';

export interface OpenAIProviderOptions extends AIProviderConfig {}

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(options: OpenAIProviderOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });
    this.model = options.model || 'gpt-4o-mini';
  }

  async extract(text: string, schema: OntologySchema): Promise<LLMExtractionResult> {
    const entityTypes = Object.entries(schema.entity_types)
      .map(([k, v]) => {
        const templateInfo = v.template?.info?.map(i => i.key).join(', ');
        return `- ${k}: ${v.description}${templateInfo ? ` (字段: ${templateInfo})` : ''}`;
      })
      .join('\n');

    const relationTypes = Object.entries(schema.relations || {})
      .map(([k, v]) => `- ${k}: ${(v as any).description || k}`)
      .join('\n');

    const prompt = `你是一个专业的信息提取助手。请从以下新闻文本中提取**所有重要信息**。

## 实体类型定义
${entityTypes}

## 关系类型定义
${relationTypes}

## 提取要求

### 1. 实体提取
提取文中所有重要实体，包括人物、组织、地点等。对于每个实体：
- **name**: 规范名称（首选正式全称）
- **aliases**: 所有提及的别名、缩写
- **type**: 从上述实体类型中选择最匹配的
- **context**: 保留**完整的原始描述**，不要简化！例如 "Israeli Prime Minister Benjamin Netanyahu declared war on Hamas" 而非 "Prime Minister"
- **info**: 提取结构化信息（如角色、组织、位置等）
- **relations**: 与其他实体的关系

### 2. 事件提取
提取文中所有重要事件，包括：
- 事件名称、日期、地点
- 参与者（人物、组织）
- 事件描述（保留完整细节）
- 结果和影响

### 3. 声明提取
提取所有重要声明、引言、观点：
- 发言人及其角色
- 声明内容（**完整引用，不要简化**）
- 背景

### 4. 文档摘要
用 2-3 句话概括文档主要内容

## 输出格式（JSON）
{
  "summary": "文档摘要",
  "entities": [
    {
      "name": "实体名称",
      "aliases": ["别名"],
      "type": "实体类型",
      "context": ["完整原始描述句子，保留所有细节"],
      "confidence": 0.9,
      "info": {"role": "...", "organization": "..."},
      "relations": [{"type": "works_for", "target": "其他实体", "confidence": 0.8}]
    }
  ],
  "events": [
    {
      "name": "事件名称",
      "date": "日期（如有）",
      "location": "地点（如有）",
      "participants": ["参与者1", "参与者2"],
      "description": "完整事件描述",
      "outcome": "结果/影响",
      "context": ["来源句子"],
      "confidence": 0.9
    }
  ],
  "statements": [
    {
      "summary": "声明摘要",
      "speaker": "发言人",
      "speakerRole": "发言人角色",
      "date": "日期",
      "content": "完整声明内容（原文引用）",
      "context": "背景说明",
      "confidence": 0.9
    }
  ]
}

## 待处理文本
${text}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{"entities": []}';
      const result = this.safeParseJson(content);

      return {
        summary: result.summary || '',
        entities: this.normalizeEntities(result.entities || []),
        events: this.normalizeEvents(result.events || []),
        statements: this.normalizeStatements(result.statements || []),
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      return { entities: [] };
    }
  }

  /**
   * 标准化实体提取结果
   */
  private normalizeEntities(entities: any[]): EntityExtraction[] {
    return entities.map((e: any) => ({
      name: e.name || '',
      aliases: e.aliases || [],
      type: e.type || 'Concept',
      context: Array.isArray(e.context) ? e.context : [e.context].filter(Boolean),
      confidence: e.confidence || 0.5,
      info: e.info || {},
      relations: e.relations || [],
    }));
  }

  /**
   * 标准化事件提取结果
   */
  private normalizeEvents(events: any[]): EventExtraction[] {
    return events.map((e: any) => ({
      name: e.name || '',
      type: 'Event' as const,
      date: e.date,
      location: e.location,
      participants: e.participants || [],
      description: e.description || '',
      outcome: e.outcome,
      context: Array.isArray(e.context) ? e.context : [e.context].filter(Boolean),
      confidence: e.confidence || 0.5,
    }));
  }

  /**
   * 标准化声明提取结果
   */
  private normalizeStatements(statements: any[]): StatementExtraction[] {
    return statements.map((s: any) => ({
      summary: s.summary || '',
      speaker: s.speaker || '',
      speakerRole: s.speakerRole,
      date: s.date,
      content: s.content || '',
      context: s.context || '',
      confidence: s.confidence || 0.5,
    }));
  }

  /**
   * 安全解析 JSON，尝试修复常见问题
   */
  private safeParseJson(content: string): any {
    try {
      return JSON.parse(content);
    } catch (e) {
      let fixed = content.trim();

      // 尝试补全被截断的 JSON
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/\]/g) || []).length;
      const openBraces = (fixed.match(/\{/g) || []).length;
      const closeBraces = (fixed.match(/\}/g) || []).length;

      fixed += '"}]'.repeat(Math.max(0, openBraces - closeBraces));
      fixed += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
      fixed += '}'.repeat(Math.max(0, openBraces - closeBraces));

      try {
        return JSON.parse(fixed);
      } catch {
        console.warn('JSON parse failed, returning empty result');
        return { entities: [], events: [], statements: [] };
      }
    }
  }

  async classify(text: string, types: string[]): Promise<ClassificationResult> {
    const prompt = `请将以下文本分类到最合适的类型。

可选类型：${types.join(', ')}

文本：${text.slice(0, 500)}

请以 JSON 格式输出：{"type": "类型名称", "confidence": 0.9}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{"type": "", "confidence": 0}';
      const result = JSON.parse(content);

      return {
        type: result.type || types[0] || '',
        confidence: result.confidence || 0,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      return { type: types[0] || '', confidence: 0 };
    }
  }

  async generate(prompt: string, context: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: context },
          { role: 'user', content: prompt },
        ],
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI API error:', error);
      return '';
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
