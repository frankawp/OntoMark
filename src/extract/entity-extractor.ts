// EntityExtractor - 从 raw 文档提取实体

import * as fs from 'fs/promises';
import * as path from 'path';
import { OntologySchema } from '../schema/types';
import { LLMProvider } from '../llm/types';
import { ExtractResult, EntityMention } from './types';

/**
 * EntityExtractor 负责从 raw 文档中提取实体信息
 */
export class EntityExtractor {
  private schema: OntologySchema;
  private llmProvider: LLMProvider;

  constructor(schema: OntologySchema, llmProvider: LLMProvider) {
    this.schema = schema;
    this.llmProvider = llmProvider;
  }

  /**
   * 从单个 raw 文档提取实体
   * @param rawPath - raw 文档路径
   * @param content - 可选的文档内容，如果不提供则从文件读取
   */
  async extract(rawPath: string, content?: string): Promise<ExtractResult> {
    try {
      // 读取文档内容
      const docContent = content ?? await fs.readFile(rawPath, 'utf-8');
      const fileName = path.basename(rawPath, '.md');

      // 调用 LLM 提取实体
      const extraction = this.llmProvider.extract
        ? await this.llmProvider.extract({
            content: docContent,
            schema: this.schema,
            fileName,
          })
        : { entities: [] };

      // 添加来源路径到每个实体
      const entities: EntityMention[] = extraction.entities.map(e => ({
        ...e,
        sourcePath: rawPath,
      }));

      return {
        rawPath,
        entities,
        processed: true,
      };
    } catch (error) {
      // 处理失败时返回空结果
      return {
        rawPath,
        entities: [],
        processed: false,
      };
    }
  }

  /**
   * 批量提取多个文档
   * @param rawPaths - raw 文档路径列表
   */
  async extractAll(rawPaths: string[]): Promise<ExtractResult[]> {
    const results: ExtractResult[] = [];

    for (const rawPath of rawPaths) {
      try {
        const result = await this.extract(rawPath);
        results.push(result);
      } catch (error) {
        results.push({
          rawPath,
          entities: [],
          processed: false,
        });
      }
    }

    return results;
  }
}