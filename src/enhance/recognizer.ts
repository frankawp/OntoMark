import { LLMProvider, RecognizerInput, RecognizerOutput } from '../llm/types';
import { OntologySchema } from '../schema/types';
import { RecognizedEntity } from './types';

export class EntityRecognizer {
  private llmProvider: LLMProvider;
  private schema: OntologySchema;

  constructor(llmProvider: LLMProvider, schema: OntologySchema) {
    this.llmProvider = llmProvider;
    this.schema = schema;
  }

  async recognize(
    content: string,
    existingEntities: string[]
  ): Promise<RecognizerOutput> {
    // First, find exact matches from existing entities
    const indexMatches = this.findIndexMatches(content, existingEntities);

    // Then, call LLM for additional recognition
    const llmResult = await this.llmProvider.recognize({
      content,
      schema: this.schema,
      existingEntities,
    });

    // Merge results, prioritizing index matches
    const merged = this.mergeResults(indexMatches, llmResult.entities);

    return { entities: merged };
  }

  private findIndexMatches(
    content: string,
    existingEntities: string[]
  ): RecognizedEntity[] {
    const matches: RecognizedEntity[] = [];

    for (const entity of existingEntities) {
      let start = 0;
      while (true) {
        const index = content.indexOf(entity, start);
        if (index === -1) break;

        matches.push({
          text: entity,
          start: index,
          end: index + entity.length,
          confidence: 1.0,
        });

        start = index + entity.length;
      }
    }

    return matches;
  }

  private mergeResults(
    indexMatches: RecognizedEntity[],
    llmEntities: RecognizerOutput['entities']
  ): RecognizerOutput['entities'] {
    const result: RecognizerOutput['entities'] = [];

    // Create a map of LLM entities by text for quick lookup
    const llmEntityMap = new Map<string, typeof llmEntities[0]>();
    for (const entity of llmEntities) {
      const key = entity.text.toLowerCase();
      llmEntityMap.set(key, entity);
    }

    // Add index matches, merging entityType from LLM if available
    for (const match of indexMatches) {
      const llmEntity = llmEntityMap.get(match.text.toLowerCase());
      result.push({
        text: match.text,
        entityType: match.entityType || llmEntity?.entityType,
        confidence: match.confidence,
      });
    }

    // Add LLM entities that don't overlap with index matches
    for (const llmEntity of llmEntities) {
      const overlaps = indexMatches.some(
        m => m.text.toLowerCase() === llmEntity.text.toLowerCase()
      );

      if (!overlaps) {
        result.push(llmEntity);
      }
    }

    return result;
  }

  private rangesOverlap(
    start1: number,
    end1: number,
    start2: number,
    end2: number
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  buildPrompt(content: string, existingEntities: string[]): string {
    const entityTypes = Object.entries(this.schema.entity_types)
      .map(([k, v]) => `- ${k}: ${v.description}`)
      .join('\n');

    return `从以下文本中识别实体。

实体类型定义：
${entityTypes}

已有实体（优先匹配）：
${existingEntities.join(', ')}

文本：
${content}

以 JSON 格式输出识别结果：
{
  "entities": [
    {"text": "原文文本", "entityType": "类型", "confidence": 0.9}
  ]
}`;
  }
}
