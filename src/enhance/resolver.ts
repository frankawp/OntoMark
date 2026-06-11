import { EntityIndex } from '../index/types';
import { MatchResult } from './types';
import { ConflictError, ConflictCandidate } from '../utils/errors';

export interface ResolveResult {
  resolved: boolean;
  match?: MatchResult;
  conflict?: ConflictError;
}

export class EntityResolver {
  matchEntity(text: string, index: EntityIndex): MatchResult {
    // 1. Exact match on file name (document)
    for (const [filePath, entity] of index.entities) {
      if (entity.fileName === text) {
        return {
          type: 'document',
          text,
          target: {
            fileName: entity.fileName,
            filePath: entity.filePath,
          },
        };
      }
    }

    // 2. Alias match
    const aliasMatches = index.aliasIndex.get(text) || [];
    if (aliasMatches.length === 1) {
      const filePath = aliasMatches[0];
      const entity = index.entities.get(filePath);
      return {
        type: 'alias',
        text,
        target: {
          fileName: entity!.fileName,
          filePath: entity!.filePath,
        },
        original: text,
      };
    }
    if (aliasMatches.length > 1) {
      const candidates = aliasMatches.map(fp => {
        const entity = index.entities.get(fp);
        return {
          filePath: fp,
          entityType: entity?.entityType,
          matchType: 'alias' as const,
        };
      });
      return { type: 'alias', text, candidates };
    }

    // 3. Heading match
    const headingMatches = index.headingIndex.get(text) || [];
    if (headingMatches.length === 1) {
      const match = headingMatches[0];
      return {
        type: 'heading',
        text,
        target: {
          fileName: text,
          filePath: match.filePath,
          heading: match.heading,
        },
      };
    }
    if (headingMatches.length > 1) {
      const candidates = headingMatches.map(h => ({
        filePath: h.filePath,
        matchType: 'heading' as const,
      }));
      return { type: 'heading', text, candidates };
    }

    // 4. Block match
    const blockMatch = index.blockIndex.get(text);
    if (blockMatch) {
      return {
        type: 'block',
        text,
        target: {
          fileName: text,
          filePath: blockMatch.filePath,
          blockId: blockMatch.blockId,
        },
      };
    }

    // 5. No match
    return { type: 'unknown', text };
  }

  resolve(text: string, index: EntityIndex): ResolveResult {
    const match = this.matchEntity(text, index);

    if (match.candidates && match.candidates.length > 0) {
      return {
        resolved: false,
        match,
        conflict: new ConflictError(
          match.type as 'alias' | 'entity' | 'heading',
          text,
          match.candidates
        ),
      };
    }

    if (match.type === 'unknown') {
      return { resolved: false, match };
    }

    return { resolved: true, match };
  }
}