// src/index/types.ts
export interface EntityInfo {
  filePath: string;
  fileName: string;
  entityType?: string;
  aliases: string[];
  headings: string[];
  blocks: string[];
  fileHash: string;
}

export interface HeadingInfo {
  filePath: string;
  heading: string;
  level: number;
}

export interface BlockInfo {
  filePath: string;
  blockId: string;
}

export interface CacheData {
  schemaHash: string;
  fileHashes: Record<string, {
    fileHash: string;
    combinedHash: string;
    enhanced: boolean;
  }>;
}

export interface EntityIndex {
  entities: Map<string, EntityInfo>;
  aliasIndex: Map<string, string[]>;
  headingIndex: Map<string, HeadingInfo[]>;
  blockIndex: Map<string, BlockInfo>;
}
