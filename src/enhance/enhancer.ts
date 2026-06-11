import * as fs from 'fs/promises';
import { OntologySchema } from '../schema/types';
import { EntityIndex } from '../index/types';
import { LLMProvider, RecognizerOutput } from '../llm/types';
import { EnhanceResult } from './types';
import { FrontmatterHandler } from './frontmatter';
import { EntityResolver } from './resolver';
import { EntityLinker } from './linker';
import { EntityRecognizer } from './recognizer';
import { getFileNameWithoutExtension } from '../utils/path';

export class DocumentEnhancer {
  private vaultPath: string;
  private schema: OntologySchema;
  private index: EntityIndex;
  private llmProvider: LLMProvider;
  private frontmatterHandler: FrontmatterHandler;
  private resolver: EntityResolver;
  private linker: EntityLinker;
  private recognizer: EntityRecognizer;

  constructor(
    vaultPath: string,
    schema: OntologySchema,
    index: EntityIndex,
    llmProvider: LLMProvider
  ) {
    this.vaultPath = vaultPath;
    this.schema = schema;
    this.index = index;
    this.llmProvider = llmProvider;

    this.frontmatterHandler = new FrontmatterHandler();
    this.resolver = new EntityResolver();
    this.linker = new EntityLinker();
    this.recognizer = new EntityRecognizer(llmProvider, schema);
  }

  async enhance(filePath: string): Promise<EnhanceResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    const { frontmatter, body } = this.frontmatterHandler.parse(content);

    const fileName = getFileNameWithoutExtension(filePath);

    // Get existing entities for recognition context
    const existingEntities = Array.from(this.index.entities.values()).map(e => e.fileName);

    // Recognize entities first (用于检测文档类型)
    const recognizeResult = await this.recognizer.recognize(body, existingEntities);

    // Detect entity type using recognition results
    const entityType = await this.detectEntityType(
      fileName,
      filePath,
      content,
      recognizeResult.entities
    );

    // Process each recognized entity
    const linksToAdd: Array<{ text: string; start: number; end: number; link: string }> = [];
    const entitiesRecognized: string[] = [];
    const coveredRanges: Array<{ start: number; end: number }> = [];

    for (const entity of recognizeResult.entities) {
      const resolveResult = this.resolver.resolve(entity.text, this.index);

      if (resolveResult.resolved && resolveResult.match) {
        const link = this.linker.generateWikiLink(resolveResult.match);

        // Find position in body (escape special regex characters)
        const escapedText = entity.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedText, 'g');
        let match;
        while ((match = regex.exec(body)) !== null) {
          // Check if already linked
          if (this.isAlreadyLinked(body, match.index)) continue;

          // Check if range is already covered by another link
          if (this.isRangeCovered(match.index, match.index + entity.text.length, coveredRanges)) {
            continue;
          }

          linksToAdd.push({
            text: entity.text,
            start: match.index,
            end: match.index + entity.text.length,
            link,
          });
          coveredRanges.push({ start: match.index, end: match.index + entity.text.length });
          entitiesRecognized.push(entity.text);
          break; // Only link first occurrence per entity
        }
      } else if (resolveResult.conflict) {
        throw resolveResult.conflict;
      }
    }

    // Insert links
    const enhancedBody = this.linker.insertLinks(body, linksToAdd);

    // Enhance frontmatter
    const enhancedFrontmatter = entityType
      ? this.frontmatterHandler.enhance(frontmatter, entityType)
      : frontmatter;

    // Stringify result
    const enhancedContent = this.frontmatterHandler.stringify(enhancedFrontmatter, enhancedBody);

    // Determine changes
    const tagsAdded = Array.isArray(frontmatter.tags) && Array.isArray(enhancedFrontmatter.tags)
      ? enhancedFrontmatter.tags.filter((t: string) => !frontmatter.tags.includes(t))
      : [];

    // Write enhanced content back to file
    await fs.writeFile(filePath, enhancedContent, 'utf-8');

    return {
      filePath,
      enhanced: linksToAdd.length > 0 || tagsAdded.length > 0,
      changes: {
        linksAdded: linksToAdd.length,
        tagsAdded,
        entities: [...new Set(entitiesRecognized)],
      },
      content: enhancedContent,
    };
  }

  private isAlreadyLinked(content: string, position: number): boolean {
    // Check if position is already inside a wiki link
    const before = content.slice(Math.max(0, position - 2), position);
    const after = content.slice(position, position + 2);

    return before === '[[' || after === ']]' || content.slice(position - 1, position + 1) === ']]';
  }

  private isRangeCovered(
    start: number,
    end: number,
    coveredRanges: Array<{ start: number; end: number }>
  ): boolean {
    return coveredRanges.some(range => {
      return start < range.end && end > range.start;
    });
  }

  async detectEntityType(
    fileName: string,
    filePath: string,
    content: string,
    recognizedEntities?: RecognizerOutput['entities']
  ): Promise<string | undefined> {
    // First check if already in index
    const entity = this.index.entities.get(filePath);
    if (entity?.entityType) {
      return entity.entityType;
    }

    // Check existing frontmatter
    const { frontmatter, body } = this.frontmatterHandler.parse(content);
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];

    for (const tag of tags) {
      if (this.schema.entity_types[tag]) {
        return tag;
      }
    }

    // If recognized entities are provided, check if file name matches any
    if (recognizedEntities) {
      for (const entity of recognizedEntities) {
        if (entity.text === fileName && entity.entityType) {
          return entity.entityType;
        }
      }
    } else {
      // Call LLM directly to get entities if not provided
      try {
        const existingEntities = Array.from(this.index.entities.values()).map(e => e.fileName);
        const recognizeResult = await this.llmProvider.recognize({
          content: body,
          schema: this.schema,
          existingEntities,
        });
        for (const entity of recognizeResult.entities) {
          if (entity.text === fileName && entity.entityType) {
            return entity.entityType;
          }
        }
      } catch {
        // Ignore LLM errors in type detection
      }
    }

    // Use LLM to infer if available
    if (this.llmProvider.inferEntityType) {
      return await this.llmProvider.inferEntityType({
        fileName,
        content,
        schema: this.schema,
      });
    }

    return undefined;
  }
}