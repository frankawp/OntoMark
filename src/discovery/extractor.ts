// src/discovery/extractor.ts
import * as fs from 'fs/promises';
import { OntologySchema } from '../schema/types';
import { AIProvider } from '../llm/types';
import { parseMarkdown } from '../parser/ast';
import { md5 } from '../utils/md5';
import { EntityMention, ExtractionResult } from './types';

/**
 * EntityExtractor - 从 raw 文档提取实体（V2 增强版）
 */
export class EntityExtractor {
  private schema: OntologySchema;
  private aiProvider: AIProvider;

  constructor(schema: OntologySchema, aiProvider: AIProvider) {
    this.schema = schema;
    this.aiProvider = aiProvider;
  }

  /**
   * 从文件提取实体
   */
  async extractFromFile(filePath: string): Promise<ExtractionResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    return this.extractFromContent(content, filePath);
  }

  /**
   * 从内容提取实体
   */
  async extractFromContent(
    content: string,
    sourceFile: string
  ): Promise<ExtractionResult> {
    const timestamp = new Date().toISOString();
    const hash = md5(content);

    const doc = parseMarkdown(content);
    const text = doc.text;

    const extraction = await this.aiProvider.extract(text, this.schema);

    const entities: EntityMention[] = extraction.entities.map((e) => ({
      name: e.name,
      entityType: e.type,
      aliases: e.aliases,
      context: e.context[0] || '',
      confidence: e.confidence,
      location: {
        file: sourceFile,
        line: findLineNumber(content, e.name),
        text: e.name,
      },
    }));

    return {
      entities,
      metadata: { sourceFile, timestamp, hash },
    };
  }

  /**
   * 批量提取实体
   */
  async extractAll(filePaths: string[]): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];
    for (const filePath of filePaths) {
      try {
        const result = await this.extractFromFile(filePath);
        results.push(result);
      } catch {
        results.push({
          entities: [],
          metadata: {
            sourceFile: filePath,
            timestamp: new Date().toISOString(),
            hash: '',
          },
        });
      }
    }
    return results;
  }
}

/**
 * 查找实体名称在文件中的行号
 */
function findLineNumber(content: string, name: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(name)) {
      return i + 1;
    }
  }
  return 1;
}