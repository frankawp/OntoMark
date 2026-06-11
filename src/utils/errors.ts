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