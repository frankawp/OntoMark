/**
 * OpenAI Provider 实现
 * 支持 OpenAI API 和 DeepSeek API（通过 baseURL）
 */

import OpenAI from 'openai';
import {
  AIProvider,
  AIProviderConfig,
  ExtractionResult,
  EntityExtraction,
  ClassificationResult,
} from './types';
import { OntologySchema } from '../schema/types';

/**
 * OpenAI Provider 配置选项
 */
export interface OpenAIProviderOptions extends AIProviderConfig {}

/**
 * OpenAI Provider 实现
 * 实现 AIProvider 接口，支持 OpenAI 和兼容 API
 */
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  /**
   * 创建 OpenAI Provider 实例
   * @param options 配置选项
   */
  constructor(options: OpenAIProviderOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });
    this.model = options.model || 'gpt-4o-mini';
  }

  /**
   * 从文本中提取实体
   * @param text 待提取的文本
   * @param schema 本体 Schema
   * @returns 提取结果
   */
  async extract(text: string, schema: OntologySchema): Promise<ExtractionResult> {
    const entityTypes = Object.entries(schema.entity_types)
      .map(([k, v]) => {
        const template = v.template
          ? `\n    模板字段: ${v.template.info.map(i => i.key).join(', ')}`
          : '';
        return `- ${k}: ${v.description}${template}`;
      })
      .join('\n');

    const prompt = `你是一个信息提取助手。请从以下文本中提取所有重要实体及其关键信息。

实体类型定义：
${entityTypes}

请以 JSON 格式输出，不要输出其他内容：
{
  "entities": [
    {
      "name": "实体名称（规范形式）",
      "aliases": ["别名1", "别名2"],
      "type": "实体类型",
      "context": ["相关上下文片段1"],
      "confidence": 0.9,
      "info": {
        "字段名": "提取的信息"
      }
    }
  ]
}

待处理文本：
${text}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{"entities": []}';
      const result = JSON.parse(content);

      return {
        entities: (result.entities || []).map((e: Partial<EntityExtraction>) => ({
          name: e.name || '',
          aliases: e.aliases || [],
          type: e.type || '',
          context: e.context || [],
          confidence: e.confidence || 0.5,
          info: e.info || {},
        })),
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      return { entities: [] };
    }
  }

  /**
   * 对文本进行分类
   * @param text 待分类的文本
   * @param types 可能的分类类型列表
   * @returns 分类结果
   */
  async classify(text: string, types: string[]): Promise<ClassificationResult> {
    const prompt = `请将以下文本分类到最合适的类型。

可选类型：${types.join(', ')}

文本：${text.slice(0, 500)}

请以 JSON 格式输出，不要输出其他内容：
{"type": "类型名称", "confidence": 0.9}`;

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
      return {
        type: types[0] || '',
        confidence: 0,
      };
    }
  }

  /**
   * 生成文本内容
   * @param prompt 提示文本
   * @param context 上下文信息
   * @returns 生成的文本
   */
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

  /**
   * 检查 API 是否可用
   * @returns API 是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
