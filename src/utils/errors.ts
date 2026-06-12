export class OntoMarkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OntoMarkError';
  }
}

export class SchemaError extends OntoMarkError {
  constructor(
    message: string,
    public filePath: string
  ) {
    super(message);
    this.name = 'SchemaError';
  }
}

export interface ConflictCandidate {
  filePath: string;
  entityType?: string;
  matchType: 'document' | 'alias' | 'heading';
}

export class ConflictError extends OntoMarkError {
  constructor(
    public conflictType: 'alias' | 'entity' | 'heading',
    public text: string,
    public candidates: ConflictCandidate[]
  ) {
    super(`冲突: "${text}" 匹配到多个实体`);
    this.name = 'ConflictError';
  }
}

// ============== V2 错误类型 ==============

/**
 * 验证错误
 */
export class ValidationError extends OntoMarkError {
  constructor(message: string, public context?: Record<string, unknown>) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 提取错误
 */
export class ExtractionError extends OntoMarkError {
  constructor(
    message: string,
    public filePath: string
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}

/**
 * 消歧冲突错误
 */
export class ResolutionConflictError extends OntoMarkError {
  constructor(
    public entityName: string,
    public candidates: string[],
    public conflictType: 'different_types' | 'low_confidence' | 'ambiguous'
  ) {
    super(`实体 "${entityName}" 存在消歧冲突: ${candidates.join(', ')}`);
    this.name = 'ResolutionConflictError';
  }
}

/**
 * LLM Provider 错误
 */
export class LLMProviderError extends OntoMarkError {
  constructor(
    message: string,
    public provider: string
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}