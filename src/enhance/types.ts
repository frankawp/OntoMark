import { ConflictCandidate } from '../utils/errors';

export type MatchType = 'document' | 'alias' | 'heading' | 'block' | 'unknown';

export interface MatchResult {
  type: MatchType;
  text: string;
  target?: {
    fileName: string;
    filePath: string;
    heading?: string;
    blockId?: string;
  };
  original?: string;
  candidates?: ConflictCandidate[];
}

export interface EnhanceResult {
  filePath: string;
  enhanced: boolean;
  changes: {
    linksAdded: number;
    tagsAdded: string[];
    entities: string[];
  };
  content: string;
}

export interface RecognizedEntity {
  text: string;
  start: number;
  end: number;
  entityType?: string;
  confidence: number;
}