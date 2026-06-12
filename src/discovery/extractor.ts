// src/discovery/extractor.ts
import * as fs from 'fs/promises';
import { OntologySchema } from '../schema/types';
import { AIProvider } from '../llm/types';
import { parseMarkdown } from '../parser/ast';
import { md5 } from '../utils/md5';
import { EntityMention, EventMention, StatementMention, ExtractionResult } from './types';

/**
 * EntityExtractor - 从 raw 文档提取实体、事件、声明（V2 增强版）
 */
export class EntityExtractor {
  private schema: OntologySchema;
  private aiProvider: AIProvider;

  constructor(schema: OntologySchema, aiProvider: AIProvider) {
    this.schema = schema;
    this.aiProvider = aiProvider;
  }

  /**
   * 从文件提取
   */
  async extractFromFile(filePath: string): Promise<ExtractionResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    return this.extractFromContent(content, filePath);
  }

  /**
   * 从内容提取
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

    // 转换实体
    const entities: EntityMention[] = extraction.entities.map((e) => ({
      name: e.name,
      entityType: e.type,
      aliases: e.aliases,
      context: e.context, // 保留完整上下文数组
      confidence: e.confidence,
      info: e.info,
      relations: e.relations,
      location: {
        file: sourceFile,
        line: findLineNumber(content, e.name),
        text: e.name,
      },
    }));

    // 转换事件
    const events: EventMention[] = (extraction.events || []).map((ev) => ({
      name: ev.name,
      date: ev.date,
      location: ev.location,
      participants: ev.participants,
      description: ev.description,
      outcome: ev.outcome,
      context: ev.context,
      confidence: ev.confidence,
      locationInfo: {
        file: sourceFile,
        line: findLineNumber(content, ev.name),
      },
    }));

    // 转换声明
    const statements: StatementMention[] = (extraction.statements || []).map((s) => ({
      summary: s.summary,
      speaker: s.speaker,
      speakerRole: s.speakerRole,
      date: s.date,
      content: s.content,
      context: s.context,
      confidence: s.confidence,
      locationInfo: {
        file: sourceFile,
        line: findLineNumber(content, s.speaker),
      },
    }));

    return {
      entities,
      events,
      statements,
      summary: extraction.summary,
      metadata: { sourceFile, timestamp, hash },
    };
  }

  /**
   * 批量提取
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
          events: [],
          statements: [],
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
 * 查找文本在文件中的行号
 */
function findLineNumber(content: string, searchText: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchText)) {
      return i + 1;
    }
  }
  return 1;
}
