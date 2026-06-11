import OpenAI from 'openai';
import { LLMProvider, RecognizerInput, RecognizerOutput, EntityTypeInfoInput } from './types';
import { ExtractionInput, ExtractionOutput } from '../extract/types';

export interface DeepSeekProviderOptions {
  apiKey: string;
  baseURL?: string;
  model?: string;
}

export class DeepSeekProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(options: DeepSeekProviderOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL || 'https://api.deepseek.com',
    });
    this.model = options.model || 'deepseek-chat';
  }

  async recognize(input: RecognizerInput): Promise<RecognizerOutput> {
    const entityTypes = Object.entries(input.schema.entity_types)
      .map(([k, v]) => `- ${k}: ${v.description}`)
      .join('\n');

    const prompt = `你是一个实体识别助手。请从以下文本中识别出所有可能的实体。

实体类型定义：
${entityTypes}

已有实体列表（优先匹配）：
${input.existingEntities.join(', ')}

请以 JSON 格式输出，不要输出其他内容：
{"entities": [{"text": "原文中的实体文本", "entityType": "实体类型", "confidence": 0.9}]}

待处理文本：
${input.content}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{"entities": []}';
      const result = JSON.parse(content);

      return {
        entities: result.entities || [],
      };
    } catch (error) {
      console.error('DeepSeek API error:', error);
      return { entities: [] };
    }
  }

  async inferEntityType(input: EntityTypeInfoInput): Promise<string> {
    const entityTypes = Object.entries(input.schema.entity_types)
      .map(([k, v]) => `- ${k}: ${v.description}`)
      .join('\n');

    const prompt = `根据以下文件名和内容，推断最合适的实体类型。

文件名：${input.fileName}

内容摘要（前 500 字）：
${input.content.slice(0, 500)}

可选实体类型：
${entityTypes}

请只输出一个实体类型名称，不要输出其他内容。`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.choices[0]?.message?.content || '';
      // 提取实体类型名称
      const typeMatch = content.match(/\b(Concept|System|Component|ADR|Requirement|Incident|Team|Person|Project)\b/);
      return typeMatch?.[1] || 'Concept';
    } catch (error) {
      console.error('DeepSeek API error:', error);
      return 'Concept';
    }
  }

  async extract(input: ExtractionInput): Promise<ExtractionOutput> {
    const entityTypes = Object.entries(input.schema.entity_types)
      .map(([k, v]) => {
        const template = v.template
          ? `\n    模板字段: ${v.template.info.map(i => i.key).join(', ')}`
          : '';
        return `- ${k}: ${v.description}${template}`;
      })
      .join('\n');

    const prompt = `你是一个信息提取助手。请从以下文档中提取所有重要实体及其关键信息。

文档文件名：${input.fileName}

实体类型定义：
${entityTypes}

请以 JSON 格式输出，不要输出其他内容：
{
  "entities": [
    {
      "name": "实体名称（规范形式）",
      "aliases": ["别名1", "别名2"],
      "type": "实体类型",
      "context": ["相关上下文片段1", "相关上下文片段2"],
      "confidence": 0.9,
      "info": {
        "字段名": "提取的信息"
      }
    }
  ]
}

待处理文档：
${input.content}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{"entities": []}';
      const result = JSON.parse(content);

      return {
        entities: (result.entities || []).map((e: any) => ({
          name: e.name,
          aliases: e.aliases || [],
          type: e.type,
          context: e.context || [],
          confidence: e.confidence || 0.5,
          info: e.info || {},
        })),
      };
    } catch (error) {
      console.error('DeepSeek API error:', error);
      return { entities: [] };
    }
  }
}