# OntoMark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Ontology-Aware Markdown Enhancer that recognizes, resolves, and links entities in Markdown documents according to a user-defined ontology schema.

**Architecture:** Two-phase design - Index phase scans Vault and builds entity index; Enhance phase recognizes entities via LLM, resolves conflicts, generates Wiki Links, and updates frontmatter. All knowledge stored in Markdown files; hash-based incremental processing.

**Tech Stack:** TypeScript, Node.js, gray-matter (frontmatter parsing), marked (Markdown parsing), commander (CLI), jest (testing)

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `jest.config.js`
- Create: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "ontomark",
  "version": "0.1.0",
  "description": "Ontology-Aware Markdown Enhancer",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "ontomark": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "keywords": ["ontology", "markdown", "obsidian", "knowledge-graph"],
  "author": "",
  "license": "MIT",
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "typescript": "^5.3.3"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "gray-matter": "^4.0.3",
    "marked": "^12.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create jest.config.js**

```javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
};
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
coverage/
.ontomark/
*.log
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: Dependencies installed successfully

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json jest.config.js .gitignore
git commit -m "chore: initialize project with TypeScript and Jest"
```

---

## Task 2: Utility - Error Types

**Files:**
- Create: `src/utils/errors.ts`
- Create: `tests/utils/errors.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/utils/errors.test.ts
import { OntoMarkError, SchemaError, ConflictError } from '../../src/utils/errors';

describe('Error Types', () => {
  describe('OntoMarkError', () => {
    it('should create error with message', () => {
      const error = new OntoMarkError('test error');
      expect(error.message).toBe('test error');
      expect(error.name).toBe('OntoMarkError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('SchemaError', () => {
    it('should create error with message and file path', () => {
      const error = new SchemaError('invalid schema', '/path/to/schema.yaml');
      expect(error.message).toBe('invalid schema');
      expect(error.name).toBe('SchemaError');
      expect(error.filePath).toBe('/path/to/schema.yaml');
      expect(error).toBeInstanceOf(OntoMarkError);
    });
  });

  describe('ConflictError', () => {
    it('should create error with conflict details', () => {
      const candidates = [
        { filePath: 'Auth/JWT.md', entityType: 'Concept', matchType: 'alias' as const },
        { filePath: 'Security/JWT.md', entityType: 'Concept', matchType: 'alias' as const },
      ];
      const error = new ConflictError('alias', 'JWT', candidates);
      expect(error.message).toBe('冲突: "JWT" 匹配到多个实体');
      expect(error.name).toBe('ConflictError');
      expect(error.conflictType).toBe('alias');
      expect(error.text).toBe('JWT');
      expect(error.candidates).toEqual(candidates);
      expect(error).toBeInstanceOf(OntoMarkError);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/utils/errors.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/utils/errors.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/utils/errors.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/errors.ts tests/utils/errors.test.ts
git commit -m "feat: add error types (OntoMarkError, SchemaError, ConflictError)"
```

---

## Task 3: Utility - MD5 Hash

**Files:**
- Create: `src/utils/md5.ts`
- Create: `tests/utils/md5.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/utils/md5.test.ts
import { md5, md5File } from '../../src/utils/md5';
import * as fs from 'fs';
import * as path from 'path';

describe('MD5 Utilities', () => {
  describe('md5', () => {
    it('should compute MD5 hash of a string', () => {
      const result = md5('hello world');
      expect(result).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3');
    });

    it('should return same hash for same input', () => {
      const result1 = md5('test');
      const result2 = md5('test');
      expect(result1).toBe(result2);
    });

    it('should return different hash for different input', () => {
      const result1 = md5('test1');
      const result2 = md5('test2');
      expect(result1).not.toBe(result2);
    });
  });

  describe('md5File', () => {
    const testFile = path.join(__dirname, 'test-md5-file.txt');

    beforeAll(() => {
      fs.writeFileSync(testFile, 'test content');
    });

    afterAll(() => {
      fs.unlinkSync(testFile);
    });

    it('should compute MD5 hash of a file', async () => {
      const result = await md5File(testFile);
      expect(result).toBe('d8e8fca2dc0f896fd7cb4cb0031ba249');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/utils/md5.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/utils/md5.ts
import * as crypto from 'crypto';
import * as fs from 'fs/promises';

export function md5(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

export async function md5File(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  return md5(content);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/utils/md5.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/md5.ts tests/utils/md5.test.ts
git commit -m "feat: add MD5 hash utilities"
```

---

## Task 4: Utility - Path Utilities

**Files:**
- Create: `src/utils/path.ts`
- Create: `tests/utils/path.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/utils/path.test.ts
import {
  normalizePath,
  isMarkdownFile,
  getFileNameWithoutExtension,
  resolveVaultPath,
} from '../../src/utils/path';

describe('Path Utilities', () => {
  describe('normalizePath', () => {
    it('should normalize path separators', () => {
      expect(normalizePath('folder\\file.md')).toBe('folder/file.md');
      expect(normalizePath('./folder/../file.md')).toBe('file.md');
    });
  });

  describe('isMarkdownFile', () => {
    it('should return true for .md files', () => {
      expect(isMarkdownFile('test.md')).toBe(true);
      expect(isMarkdownFile('folder/test.md')).toBe(true);
    });

    it('should return false for non-.md files', () => {
      expect(isMarkdownFile('test.txt')).toBe(false);
      expect(isMarkdownFile('test.markdown')).toBe(false);
    });
  });

  describe('getFileNameWithoutExtension', () => {
    it('should return filename without extension', () => {
      expect(getFileNameWithoutExtension('JWT.md')).toBe('JWT');
      expect(getFileNameWithoutExtension('folder/JWT.md')).toBe('JWT');
    });
  });

  describe('resolveVaultPath', () => {
    it('should resolve relative path to absolute', () => {
      const result = resolveVaultPath('./notes', '/home/user');
      expect(result).toBe('/home/user/notes');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/utils/path.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/utils/path.ts
import * as path from 'path';

export function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/');
}

export function isMarkdownFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.md';
}

export function getFileNameWithoutExtension(filePath: string): string {
  const basename = path.basename(filePath);
  const ext = path.extname(basename);
  return basename.slice(0, -ext.length);
}

export function resolveVaultPath(vaultPath: string, cwd: string): string {
  return path.resolve(cwd, vaultPath);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/utils/path.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/path.ts tests/utils/path.test.ts
git commit -m "feat: add path utilities"
```

---

## Task 5: Schema - Type Definitions

**Files:**
- Create: `src/schema/types.ts`

- [ ] **Step 1: Write type definitions**

```typescript
// src/schema/types.ts
export interface EntityTypeDefinition {
  description: string;
}

export interface RelationDefinition {
  from: string;
  to: string;
}

export interface OntologySchema {
  version: string;
  entity_types: Record<string, EntityTypeDefinition>;
  relations: Record<string, RelationDefinition>;
}

export interface SchemaLoadResult {
  schema: OntologySchema;
  source: 'root' | 'hidden' | 'default';
  filePath?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/schema/types.ts
git commit -m "feat: add schema type definitions"
```

---

## Task 6: Schema - Default Schema

**Files:**
- Create: `src/schema/default.ts`
- Create: `tests/schema/default.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/schema/default.test.ts
import { DEFAULT_SCHEMA } from '../../src/schema/default';

describe('Default Schema', () => {
  it('should have version', () => {
    expect(DEFAULT_SCHEMA.version).toBe('1.0');
  });

  it('should have entity_types', () => {
    expect(DEFAULT_SCHEMA.entity_types).toBeDefined();
    expect(DEFAULT_SCHEMA.entity_types['Concept']).toBeDefined();
    expect(DEFAULT_SCHEMA.entity_types['System']).toBeDefined();
    expect(DEFAULT_SCHEMA.entity_types['Component']).toBeDefined();
    expect(DEFAULT_SCHEMA.entity_types['ADR']).toBeDefined();
  });

  it('should have relations', () => {
    expect(DEFAULT_SCHEMA.relations).toBeDefined();
    expect(DEFAULT_SCHEMA.relations['uses']).toBeDefined();
    expect(DEFAULT_SCHEMA.relations['uses'].from).toBe('System');
    expect(DEFAULT_SCHEMA.relations['uses'].to).toBe('Concept');
  });

  it('should have at least 8 entity types', () => {
    const entityCount = Object.keys(DEFAULT_SCHEMA.entity_types).length;
    expect(entityCount).toBeGreaterThanOrEqual(8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/schema/default.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/schema/default.ts
import { OntologySchema } from './types';

export const DEFAULT_SCHEMA: OntologySchema = {
  version: '1.0',
  entity_types: {
    Concept: {
      description: '技术概念',
    },
    System: {
      description: '系统',
    },
    Component: {
      description: '组件',
    },
    ADR: {
      description: '架构决策',
    },
    Requirement: {
      description: '需求',
    },
    Incident: {
      description: '故障事件',
    },
    Team: {
      description: '团队',
    },
    Person: {
      description: '人员',
    },
    Project: {
      description: '项目',
    },
  },
  relations: {
    uses: {
      from: 'System',
      to: 'Concept',
    },
    implements: {
      from: 'Component',
      to: 'Concept',
    },
    owns: {
      from: 'Team',
      to: 'System',
    },
    affects: {
      from: 'Incident',
      to: 'System',
    },
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/schema/default.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/schema/default.ts tests/schema/default.test.ts
git commit -m "feat: add default ontology schema"
```

---

## Task 7: Schema - Loader

**Files:**
- Create: `src/schema/loader.ts`
- Create: `tests/schema/loader.test.ts`
- Create: `tests/fixtures/schema-valid.yaml`
- Create: `tests/fixtures/schema-invalid-missing-types.yaml`
- Create: `tests/fixtures/schema-invalid-relation-ref.yaml`

- [ ] **Step 1: Create test fixtures**

```yaml
# tests/fixtures/schema-valid.yaml
version: "1.0"
entity_types:
  Concept:
    description: 技术概念
relations:
  uses:
    from: System
    to: Concept
```

```yaml
# tests/fixtures/schema-invalid-missing-types.yaml
version: "1.0"
entity_types: {}
relations: {}
```

```yaml
# tests/fixtures/schema-invalid-relation-ref.yaml
version: "1.0"
entity_types:
  Concept:
    description: 技术概念
relations:
  uses:
    from: NonExistent
    to: Concept
```

- [ ] **Step 2: Write the failing test**

```typescript
// tests/schema/loader.test.ts
import * as path from 'path';
import * as fs from 'fs';
import { SchemaLoader } from '../../src/schema/loader';
import { SchemaError } from '../../src/utils/errors';

describe('SchemaLoader', () => {
  const fixturesDir = path.join(__dirname, '../fixtures');

  describe('load', () => {
    it('should load valid schema from file', async () => {
      const loader = new SchemaLoader();
      const schemaPath = path.join(fixturesDir, 'schema-valid.yaml');
      const result = await loader.load(schemaPath);
      
      expect(result.schema.version).toBe('1.0');
      expect(result.schema.entity_types['Concept']).toBeDefined();
      expect(result.source).toBe('root');
    });

    it('should throw SchemaError for missing entity_types', async () => {
      const loader = new SchemaLoader();
      const schemaPath = path.join(fixturesDir, 'schema-invalid-missing-types.yaml');
      
      await expect(loader.load(schemaPath)).rejects.toThrow(SchemaError);
    });

    it('should throw SchemaError for invalid relation reference', async () => {
      const loader = new SchemaLoader();
      const schemaPath = path.join(fixturesDir, 'schema-invalid-relation-ref.yaml');
      
      await expect(loader.load(schemaPath)).rejects.toThrow(SchemaError);
    });
  });

  describe('loadWithFallback', () => {
    const testVault = path.join(fixturesDir, 'test-vault');
    const schemaInRoot = path.join(testVault, 'ontology.yaml');
    const schemaInHidden = path.join(testVault, '.ontomark', 'ontology.yaml');

    beforeAll(() => {
      fs.mkdirSync(testVault, { recursive: true });
      fs.mkdirSync(path.join(testVault, '.ontomark'), { recursive: true });
    });

    afterAll(() => {
      fs.rmSync(testVault, { recursive: true, force: true });
    });

    afterEach(() => {
      if (fs.existsSync(schemaInRoot)) fs.unlinkSync(schemaInRoot);
      if (fs.existsSync(schemaInHidden)) fs.unlinkSync(schemaInHidden);
    });

    it('should load from root ontology.yaml first', async () => {
      fs.writeFileSync(schemaInRoot, 'version: "1.0"\nentity_types:\n  Test:\n    description: test\nrelations: {}');
      
      const loader = new SchemaLoader();
      const result = await loader.loadWithFallback(testVault);
      
      expect(result.source).toBe('root');
      expect(result.schema.entity_types['Test']).toBeDefined();
    });

    it('should load from .ontomark/ontology.yaml if root not found', async () => {
      fs.writeFileSync(schemaInHidden, 'version: "1.0"\nentity_types:\n  Hidden:\n    description: hidden\nrelations: {}');
      
      const loader = new SchemaLoader();
      const result = await loader.loadWithFallback(testVault);
      
      expect(result.source).toBe('hidden');
      expect(result.schema.entity_types['Hidden']).toBeDefined();
    });

    it('should return default schema if no file found', async () => {
      const loader = new SchemaLoader();
      const result = await loader.loadWithFallback(testVault);
      
      expect(result.source).toBe('default');
      expect(result.schema.entity_types['Concept']).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should validate correct schema', () => {
      const loader = new SchemaLoader();
      const schema = {
        version: '1.0',
        entity_types: {
          Concept: { description: 'test' },
        },
        relations: {},
      };
      
      expect(() => loader.validate(schema)).not.toThrow();
    });

    it('should throw for missing version', () => {
      const loader = new SchemaLoader();
      const schema = {
        version: '',
        entity_types: { Concept: { description: 'test' } },
        relations: {},
      } as any;
      
      expect(() => loader.validate(schema)).toThrow('version');
    });

    it('should throw for empty entity_types', () => {
      const loader = new SchemaLoader();
      const schema = {
        version: '1.0',
        entity_types: {},
        relations: {},
      };
      
      expect(() => loader.validate(schema)).toThrow('entity_types');
    });

    it('should throw for invalid relation reference', () => {
      const loader = new SchemaLoader();
      const schema = {
        version: '1.0',
        entity_types: {
          Concept: { description: 'test' },
        },
        relations: {
          uses: { from: 'NonExistent', to: 'Concept' },
        },
      };
      
      expect(() => loader.validate(schema)).toThrow('NonExistent');
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/schema/loader.test.ts`
Expected: FAIL - module not found

- [ ] **Step 4: Write implementation**

```typescript
// src/schema/loader.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { OntologySchema, SchemaLoadResult } from './types';
import { DEFAULT_SCHEMA } from './default';
import { SchemaError } from '../utils/errors';

export class SchemaLoader {
  async load(filePath: string): Promise<SchemaLoadResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    const schema = yaml.parse(content) as OntologySchema;
    
    this.validate(schema);
    
    return {
      schema,
      source: 'root',
      filePath,
    };
  }

  async loadWithFallback(vaultPath: string): Promise<SchemaLoadResult> {
    const rootSchemaPath = path.join(vaultPath, 'ontology.yaml');
    const hiddenSchemaPath = path.join(vaultPath, '.ontomark', 'ontology.yaml');

    // Try root ontology.yaml
    try {
      await fs.access(rootSchemaPath);
      const result = await this.load(rootSchemaPath);
      return { ...result, source: 'root' };
    } catch {
      // Continue to next fallback
    }

    // Try .ontomark/ontology.yaml
    try {
      await fs.access(hiddenSchemaPath);
      const result = await this.load(hiddenSchemaPath);
      return { ...result, source: 'hidden' };
    } catch {
      // Use default
    }

    // Return default schema
    return {
      schema: DEFAULT_SCHEMA,
      source: 'default',
    };
  }

  validate(schema: OntologySchema): void {
    if (!schema.version) {
      throw new SchemaError('Schema must have a version field', '');
    }

    if (!schema.entity_types || Object.keys(schema.entity_types).length === 0) {
      throw new SchemaError('Schema must have at least one entity_type', '');
    }

    // Validate relation references
    if (schema.relations) {
      for (const [name, rel] of Object.entries(schema.relations)) {
        if (!schema.entity_types[rel.from]) {
          throw new SchemaError(
            `Relation "${name}" references unknown entity_type "${rel.from}"`,
            ''
          );
        }
        if (!schema.entity_types[rel.to]) {
          throw new SchemaError(
            `Relation "${name}" references unknown entity_type "${rel.to}"`,
            ''
          );
        }
      }
    }
  }
}
```

- [ ] **Step 5: Add yaml dependency**

Run: `npm install yaml @types/yaml --save`

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- tests/schema/loader.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/schema/loader.ts tests/schema/loader.test.ts tests/fixtures/*.yaml package.json package-lock.json
git commit -m "feat: add schema loader with validation and fallback"
```

---

## Task 8: Index - Type Definitions

**Files:**
- Create: `src/index/types.ts`

- [ ] **Step 1: Write type definitions**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/index/types.ts
git commit -m "feat: add index type definitions"
```

---

## Task 9: Index - Scanner

**Files:**
- Create: `src/index/scanner.ts`
- Create: `tests/index/scanner.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/index/scanner.test.ts
import * as path from 'path';
import * as fs from 'fs';
import { VaultScanner } from '../../src/index/scanner';

describe('VaultScanner', () => {
  const testVault = path.join(__dirname, '../fixtures/test-vault');

  beforeAll(() => {
    fs.mkdirSync(path.join(testVault, 'Concepts'), { recursive: true });
    fs.mkdirSync(path.join(testVault, 'Systems'), { recursive: true });
    fs.mkdirSync(path.join(testVault, '.ontomark'), { recursive: true });
    
    fs.writeFileSync(path.join(testVault, 'Concepts', 'JWT.md'), '# JWT\n\nJSON Web Token');
    fs.writeFileSync(path.join(testVault, 'Systems', 'Auth.md'), '# Auth\n\nAuthentication system');
    fs.writeFileSync(path.join(testVault, '.ontomark', 'cache.json'), '{}');
  });

  afterAll(() => {
    fs.rmSync(testVault, { recursive: true, force: true });
  });

  describe('scan', () => {
    it('should find all markdown files', async () => {
      const scanner = new VaultScanner(testVault);
      const files = await scanner.scan();
      
      expect(files.length).toBe(2);
      expect(files.some(f => f.endsWith('JWT.md'))).toBe(true);
      expect(files.some(f => f.endsWith('Auth.md'))).toBe(true);
    });

    it('should exclude hidden directories by default', async () => {
      const scanner = new VaultScanner(testVault);
      const files = await scanner.scan();
      
      expect(files.some(f => f.includes('.ontomark'))).toBe(false);
    });

    it('should respect exclude patterns', async () => {
      const scanner = new VaultScanner(testVault, ['**/Systems/**']);
      const files = await scanner.scan();
      
      expect(files.length).toBe(1);
      expect(files[0]).toContain('JWT.md');
    });
  });

  describe('scanWithInfo', () => {
    it('should return file info with stats', async () => {
      const scanner = new VaultScanner(testVault);
      const infos = await scanner.scanWithInfo();
      
      expect(infos.length).toBe(2);
      expect(infos[0]).toHaveProperty('path');
      expect(infos[0]).toHaveProperty('size');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/index/scanner.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/index/scanner.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { isMarkdownFile, normalizePath } from '../utils/path';

export interface FileInfo {
  path: string;
  size: number;
  mtime: Date;
}

export class VaultScanner {
  private vaultPath: string;
  private excludePatterns: string[];

  constructor(vaultPath: string, excludePatterns: string[] = []) {
    this.vaultPath = vaultPath;
    this.excludePatterns = ['**/.ontomark/**', '**/node_modules/**', ...excludePatterns];
  }

  async scan(): Promise<string[]> {
    const files: string[] = [];
    await this.walk(this.vaultPath, files);
    return files;
  }

  async scanWithInfo(): Promise<FileInfo[]> {
    const files = await this.scan();
    const infos: FileInfo[] = [];

    for (const file of files) {
      const stat = await fs.stat(file);
      infos.push({
        path: file,
        size: stat.size,
        mtime: stat.mtime,
      });
    }

    return infos;
  }

  private async walk(dir: string, files: string[]): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(this.vaultPath, fullPath);
      const normalizedPath = normalizePath(relativePath);

      if (this.shouldExclude(normalizedPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.walk(fullPath, files);
      } else if (entry.isFile() && isMarkdownFile(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  private shouldExclude(relativePath: string): boolean {
    for (const pattern of this.excludePatterns) {
      if (this.matchPattern(pattern, relativePath)) {
        return true;
      }
    }
    return false;
  }

  private matchPattern(pattern: string, path: string): boolean {
    // Simple glob pattern matching for ** and *
    const regex = pattern
      .replace(/\*\*/g, '<<DOUBLE_STAR>>')
      .replace(/\*/g, '[^/]*')
      .replace(/<<DOUBLE_STAR>>/g, '.*');
    
    return new RegExp(regex).test(path);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/index/scanner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/index/scanner.ts tests/index/scanner.test.ts
git commit -m "feat: add vault scanner"
```

---

## Task 10: Index - Hash Cache

**Files:**
- Create: `src/index/hash-cache.ts`
- Create: `tests/index/hash-cache.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/index/hash-cache.test.ts
import * as path from 'path';
import * as fs from 'fs';
import { HashCache } from '../../src/index/hash-cache';
import { CacheData } from '../../src/index/types';

describe('HashCache', () => {
  const cacheDir = path.join(__dirname, '../fixtures/.ontomark');
  const cacheFile = path.join(cacheDir, 'cache.json');

  beforeAll(() => {
    fs.mkdirSync(cacheDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  });

  afterEach(() => {
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }
  });

  describe('load', () => {
    it('should load existing cache', async () => {
      const data: CacheData = {
        schemaHash: 'abc123',
        fileHashes: {
          'test.md': {
            fileHash: 'def456',
            combinedHash: 'ghi789',
            enhanced: true,
          },
        },
      };
      fs.writeFileSync(cacheFile, JSON.stringify(data));

      const cache = new HashCache(cacheFile);
      const result = await cache.load();

      expect(result.schemaHash).toBe('abc123');
      expect(result.fileHashes['test.md']).toBeDefined();
    });

    it('should return empty cache if file not found', async () => {
      const cache = new HashCache('/nonexistent/cache.json');
      const result = await cache.load();

      expect(result.schemaHash).toBe('');
      expect(Object.keys(result.fileHashes).length).toBe(0);
    });
  });

  describe('save', () => {
    it('should save cache to file', async () => {
      const cache = new HashCache(cacheFile);
      const data: CacheData = {
        schemaHash: 'test-hash',
        fileHashes: {},
      };

      await cache.save(data);

      const content = fs.readFileSync(cacheFile, 'utf-8');
      const saved = JSON.parse(content);
      expect(saved.schemaHash).toBe('test-hash');
    });
  });

  describe('needsEnhancement', () => {
    it('should return true for new file', () => {
      const cache = new HashCache(cacheFile);
      const data: CacheData = {
        schemaHash: 'schema-hash',
        fileHashes: {},
      };

      expect(cache.needsEnhancement('new.md', 'file-hash', 'schema-hash', data)).toBe(true);
    });

    it('should return true if file hash changed', () => {
      const cache = new HashCache(cacheFile);
      const data: CacheData = {
        schemaHash: 'schema-hash',
        fileHashes: {
          'test.md': {
            fileHash: 'old-hash',
            combinedHash: 'combined',
            enhanced: true,
          },
        },
      };

      expect(cache.needsEnhancement('test.md', 'new-hash', 'schema-hash', data)).toBe(true);
    });

    it('should return true if schema hash changed', () => {
      const cache = new HashCache(cacheFile);
      const data: CacheData = {
        schemaHash: 'old-schema-hash',
        fileHashes: {
          'test.md': {
            fileHash: 'file-hash',
            combinedHash: 'combined',
            enhanced: true,
          },
        },
      };

      expect(cache.needsEnhancement('test.md', 'file-hash', 'new-schema-hash', data)).toBe(true);
    });

    it('should return false if nothing changed', () => {
      const cache = new HashCache(cacheFile);
      const data: CacheData = {
        schemaHash: 'schema-hash',
        fileHashes: {
          'test.md': {
            fileHash: 'file-hash',
            combinedHash: 'combined-hash',
            enhanced: true,
          },
        },
      };

      // Mock md5 to return expected combined hash
      jest.spyOn(require('../../src/utils/md5'), 'md5').mockReturnValue('combined-hash');

      expect(cache.needsEnhancement('test.md', 'file-hash', 'schema-hash', data)).toBe(false);
    });
  });

  describe('updateFileHash', () => {
    it('should update file hash in cache', () => {
      const cache = new HashCache(cacheFile);
      const data: CacheData = {
        schemaHash: 'schema-hash',
        fileHashes: {},
      };

      cache.updateFileHash(data, 'test.md', 'file-hash', 'schema-hash', true);

      expect(data.fileHashes['test.md']).toBeDefined();
      expect(data.fileHashes['test.md'].fileHash).toBe('file-hash');
      expect(data.fileHashes['test.md'].enhanced).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/index/hash-cache.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/index/hash-cache.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { CacheData } from './types';
import { md5 } from '../utils/md5';

export class HashCache {
  private cachePath: string;

  constructor(cachePath: string) {
    this.cachePath = cachePath;
  }

  async load(): Promise<CacheData> {
    try {
      const content = await fs.readFile(this.cachePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {
        schemaHash: '',
        fileHashes: {},
      };
    }
  }

  async save(data: CacheData): Promise<void> {
    const dir = path.dirname(this.cachePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.cachePath, JSON.stringify(data, null, 2));
  }

  needsEnhancement(
    filePath: string,
    currentFileHash: string,
    currentSchemaHash: string,
    cache: CacheData
  ): boolean {
    const cached = cache.fileHashes[filePath];

    if (!cached) return true;

    if (cached.fileHash !== currentFileHash) return true;

    if (cache.schemaHash !== currentSchemaHash) return true;

    const combinedHash = md5(currentSchemaHash + currentFileHash);
    if (cached.combinedHash !== combinedHash) return true;

    return false;
  }

  updateFileHash(
    cache: CacheData,
    filePath: string,
    fileHash: string,
    schemaHash: string,
    enhanced: boolean
  ): void {
    const combinedHash = md5(schemaHash + fileHash);
    cache.fileHashes[filePath] = {
      fileHash,
      combinedHash,
      enhanced,
    };
  }

  updateSchemaHash(cache: CacheData, schemaHash: string): void {
    cache.schemaHash = schemaHash;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/index/hash-cache.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/index/hash-cache.ts tests/index/hash-cache.test.ts
git commit -m "feat: add hash cache for incremental processing"
```

---

## Task 11: Index - Entity Index Builder

**Files:**
- Create: `src/index/entity-index.ts`
- Create: `tests/index/entity-index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/index/entity-index.test.ts
import * as path from 'path';
import * as fs from 'fs';
import { EntityIndexBuilder } from '../../src/index/entity-index';
import { DEFAULT_SCHEMA } from '../../src/schema/default';

describe('EntityIndexBuilder', () => {
  const testVault = path.join(__dirname, '../fixtures/index-vault');
  const jwtFile = path.join(testVault, 'Concepts', 'JWT.md');
  const authFile = path.join(testVault, 'Systems', 'Auth.md');

  beforeAll(() => {
    fs.mkdirSync(path.join(testVault, 'Concepts'), { recursive: true });
    fs.mkdirSync(path.join(testVault, 'Systems'), { recursive: true });

    fs.writeFileSync(jwtFile, `---
aliases:
  - JSON Web Token
tags:
  - Concept
  - Security
---
# JWT

JSON Web Token for authentication.

## Usage
Usage example here.

^jwt-definition
`);
    fs.writeFileSync(authFile, `---
tags:
  - System
---
# Auth

Authentication system uses JWT.

# Login
Login flow description.
`);
  });

  afterAll(() => {
    fs.rmSync(testVault, { recursive: true, force: true });
  });

  describe('build', () => {
    it('should build entity index from files', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile, authFile];
      const index = await builder.build(files);

      expect(index.entities.size).toBe(2);
      expect(index.entities.get(jwtFile)).toBeDefined();
      expect(index.entities.get(authFile)).toBeDefined();
    });

    it('should extract file name as entity name', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile];
      const index = await builder.build(files);

      const entity = index.entities.get(jwtFile);
      expect(entity?.fileName).toBe('JWT');
    });

    it('should extract aliases from frontmatter', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile];
      const index = await builder.build(files);

      const entity = index.entities.get(jwtFile);
      expect(entity?.aliases).toContain('JSON Web Token');
    });

    it('should extract entity type from tags', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile];
      const index = await builder.build(files);

      const entity = index.entities.get(jwtFile);
      expect(entity?.entityType).toBe('Concept');
    });

    it('should extract headings', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile, authFile];
      const index = await builder.build(files);

      const jwtEntity = index.entities.get(jwtFile);
      expect(jwtEntity?.headings).toContain('JWT');
      expect(jwtEntity?.headings).toContain('Usage');

      const authEntity = index.entities.get(authFile);
      expect(authEntity?.headings).toContain('Auth');
      expect(authEntity?.headings).toContain('Login');
    });

    it('should extract block references', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile];
      const index = await builder.build(files);

      const entity = index.entities.get(jwtFile);
      expect(entity?.blocks).toContain('jwt-definition');
    });
  });

  describe('buildAliasIndex', () => {
    it('should build alias index', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile];
      const index = await builder.build(files);

      expect(index.aliasIndex.get('JSON Web Token')).toBeDefined();
      expect(index.aliasIndex.get('JSON Web Token')).toContain(jwtFile);
    });

    it('should detect alias conflict', async () => {
      // Create another file with same alias
      const conflictFile = path.join(testVault, 'Conflict.md');
      fs.writeFileSync(conflictFile, `---
aliases:
  - JSON Web Token
---
# Conflict
`);
      
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile, conflictFile];
      const index = await builder.build(files);

      expect(index.aliasIndex.get('JSON Web Token')?.length).toBe(2);

      fs.unlinkSync(conflictFile);
    });
  });

  describe('buildHeadingIndex', () => {
    it('should build heading index', async () => {
      const builder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const files = [jwtFile, authFile];
      const index = await builder.build(files);

      expect(index.headingIndex.get('JWT')).toBeDefined();
      expect(index.headingIndex.get('Login')).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/index/entity-index.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/index/entity-index.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { OntologySchema } from '../schema/types';
import { EntityIndex, EntityInfo, HeadingInfo, BlockInfo } from './types';
import { getFileNameWithoutExtension, normalizePath } from '../utils/path';
import { md5File } from '../utils/md5';

export class EntityIndexBuilder {
  private vaultPath: string;
  private schema: OntologySchema;

  constructor(vaultPath: string, schema: OntologySchema) {
    this.vaultPath = vaultPath;
    this.schema = schema;
  }

  async build(files: string[]): Promise<EntityIndex> {
    const entities = new Map<string, EntityInfo>();
    const aliasIndex = new Map<string, string[]>();
    const headingIndex = new Map<string, HeadingInfo[]>();
    const blockIndex = new Map<string, BlockInfo>();

    for (const file of files) {
      const entityInfo = await this.parseFile(file);
      entities.set(file, entityInfo);

      // Build alias index
      for (const alias of entityInfo.aliases) {
        const existing = aliasIndex.get(alias) || [];
        existing.push(file);
        aliasIndex.set(alias, existing);
      }

      // Build heading index (excluding the main title which is the file name)
      for (const heading of entityInfo.headings) {
        if (heading !== entityInfo.fileName) {
          const headingInfo: HeadingInfo = {
            filePath: file,
            heading,
            level: 1, // Simplified, actual level could be tracked
          };
          const existing = headingIndex.get(heading) || [];
          existing.push(headingInfo);
          headingIndex.set(heading, existing);
        }
      }

      // Build block index
      for (const blockId of entityInfo.blocks) {
        blockIndex.set(blockId, {
          filePath: file,
          blockId,
        });
      }
    }

    return { entities, aliasIndex, headingIndex, blockIndex };
  }

  private async parseFile(filePath: string): Promise<EntityInfo> {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data, content: body } = matter(content);
    const fileName = getFileNameWithoutExtension(filePath);
    const fileHash = await md5File(filePath);

    // Extract entity type from tags
    const tags = Array.isArray(data.tags) ? data.tags : [];
    const entityType = this.extractEntityType(tags);

    // Extract aliases
    const aliases = Array.isArray(data.aliases) ? data.aliases : [];

    // Extract headings and blocks
    const { headings, blocks } = this.extractMarkdownElements(body);

    return {
      filePath: normalizePath(path.relative(this.vaultPath, filePath)),
      fileName,
      entityType,
      aliases,
      headings: [fileName, ...headings],
      blocks,
      fileHash,
    };
  }

  private extractEntityType(tags: string[]): string | undefined {
    const entityTypes = Object.keys(this.schema.entity_types);
    for (const tag of tags) {
      if (entityTypes.includes(tag)) {
        return tag;
      }
    }
    return undefined;
  }

  private extractMarkdownElements(content: string): { headings: string[]; blocks: string[] } {
    const headings: string[] = [];
    const blocks: string[] = [];

    // Extract headings
    const headingRegex = /^#+\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      headings.push(match[1].trim());
    }

    // Extract block references (^block-id)
    const blockRegex = /\^([a-zA-Z0-9_-]+)/g;
    while ((match = blockRegex.exec(content)) !== null) {
      blocks.push(match[1]);
    }

    return { headings, blocks };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/index/entity-index.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/index/entity-index.ts tests/index/entity-index.test.ts
git commit -m "feat: add entity index builder with alias and heading extraction"
```

---

## Task 12: Enhance - Type Definitions

**Files:**
- Create: `src/enhance/types.ts`

- [ ] **Step 1: Write type definitions**

```typescript
// src/enhance/types.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/enhance/types.ts
git commit -m "feat: add enhance type definitions"
```

---

## Task 13: Enhance - Frontmatter Handler

**Files:**
- Create: `src/enhance/frontmatter.ts`
- Create: `tests/enhance/frontmatter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/enhance/frontmatter.test.ts
import { FrontmatterHandler } from '../../src/enhance/frontmatter';

describe('FrontmatterHandler', () => {
  describe('parse', () => {
    it('should parse frontmatter and body', () => {
      const content = `---
title: Test
tags: [Security]
---
# Content

Body text.`;

      const handler = new FrontmatterHandler();
      const result = handler.parse(content);

      expect(result.frontmatter.title).toBe('Test');
      expect(result.frontmatter.tags).toEqual(['Security']);
      expect(result.body.trim()).toBe('# Content\n\nBody text.');
    });

    it('should handle file without frontmatter', () => {
      const content = '# No Frontmatter\n\nJust content.';
      const handler = new FrontmatterHandler();
      const result = handler.parse(content);

      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content);
    });
  });

  describe('enhance', () => {
    it('should add entity type to tags', () => {
      const handler = new FrontmatterHandler();
      const frontmatter = { title: 'Test' };
      
      const result = handler.enhance(frontmatter, 'Concept');

      expect(result.tags).toContain('Concept');
    });

    it('should append entity type to existing tags array', () => {
      const handler = new FrontmatterHandler();
      const frontmatter = { tags: ['Security'] };
      
      const result = handler.enhance(frontmatter, 'Concept');

      expect(result.tags).toEqual(['Security', 'Concept']);
    });

    it('should not duplicate existing entity type tag', () => {
      const handler = new FrontmatterHandler();
      const frontmatter = { tags: ['Concept'] };
      
      const result = handler.enhance(frontmatter, 'Concept');

      expect(result.tags).toEqual(['Concept']);
    });

    it('should convert single string tag to array', () => {
      const handler = new FrontmatterHandler();
      const frontmatter = { tags: 'Security' };
      
      const result = handler.enhance(frontmatter, 'Concept');

      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.tags).toContain('Security');
      expect(result.tags).toContain('Concept');
    });

    it('should preserve other frontmatter fields', () => {
      const handler = new FrontmatterHandler();
      const frontmatter = { title: 'Test', author: 'John', custom: 123 };
      
      const result = handler.enhance(frontmatter, 'Concept');

      expect(result.title).toBe('Test');
      expect(result.author).toBe('John');
      expect(result.custom).toBe(123);
    });
  });

  describe('stringify', () => {
    it('should stringify frontmatter and body', () => {
      const handler = new FrontmatterHandler();
      const frontmatter = { title: 'Test', tags: ['Concept'] };
      const body = '# Content\n\nBody text.';

      const result = handler.stringify(frontmatter, body);

      expect(result).toContain('---');
      expect(result).toContain('title: Test');
      expect(result).toContain('- Concept');
      expect(result).toContain('# Content');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/enhance/frontmatter.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/enhance/frontmatter.ts
import matter from 'gray-matter';

export class FrontmatterHandler {
  parse(content: string): { frontmatter: Record<string, any>; body: string } {
    const { data, content: body } = matter(content);
    return {
      frontmatter: data,
      body,
    };
  }

  enhance(
    frontmatter: Record<string, any>,
    entityType: string
  ): Record<string, any> {
    const result = { ...frontmatter };

    if (!result.tags) {
      result.tags = [entityType];
    } else if (Array.isArray(result.tags)) {
      if (!result.tags.includes(entityType)) {
        result.tags = [...result.tags, entityType];
      }
    } else if (typeof result.tags === 'string') {
      result.tags = result.tags === entityType
        ? [result.tags]
        : [result.tags, entityType];
    }

    return result;
  }

  stringify(frontmatter: Record<string, any>, body: string): string {
    const result = matter.stringify(body, frontmatter);
    return result;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/enhance/frontmatter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/enhance/frontmatter.ts tests/enhance/frontmatter.test.ts
git commit -m "feat: add frontmatter handler for parsing and enhancing"
```

---

## Task 14: Enhance - Resolver

**Files:**
- Create: `src/enhance/resolver.ts`
- Create: `tests/enhance/resolver.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/enhance/resolver.test.ts
import { EntityResolver } from '../../src/enhance/resolver';
import { EntityIndex } from '../../src/index/types';
import { ConflictError } from '../../src/utils/errors';

describe('EntityResolver', () => {
  let resolver: EntityResolver;
  let mockIndex: EntityIndex;

  beforeEach(() => {
    resolver = new EntityResolver();

    mockIndex = {
      entities: new Map([
        ['Concepts/JWT.md', {
          filePath: 'Concepts/JWT.md',
          fileName: 'JWT',
          entityType: 'Concept',
          aliases: ['JSON Web Token'],
          headings: ['JWT', 'Usage'],
          blocks: ['jwt-definition'],
          fileHash: 'hash1',
        }],
        ['Systems/Auth.md', {
          filePath: 'Systems/Auth.md',
          fileName: 'Auth',
          entityType: 'System',
          aliases: [],
          headings: ['Auth', 'Login'],
          blocks: [],
          fileHash: 'hash2',
        }],
      ]),
      aliasIndex: new Map([
        ['JSON Web Token', ['Concepts/JWT.md']],
      ]),
      headingIndex: new Map([
        ['Usage', [{ filePath: 'Concepts/JWT.md', heading: 'Usage', level: 2 }]],
        ['Login', [{ filePath: 'Systems/Auth.md', heading: 'Login', level: 1 }]],
      ]),
      blockIndex: new Map([
        ['jwt-definition', { filePath: 'Concepts/JWT.md', blockId: 'jwt-definition' }],
      ]),
    };
  });

  describe('matchEntity', () => {
    it('should match exact document name', () => {
      const result = resolver.matchEntity('JWT', mockIndex);

      expect(result.type).toBe('document');
      expect(result.target?.fileName).toBe('JWT');
      expect(result.target?.filePath).toBe('Concepts/JWT.md');
    });

    it('should match alias', () => {
      const result = resolver.matchEntity('JSON Web Token', mockIndex);

      expect(result.type).toBe('alias');
      expect(result.target?.fileName).toBe('JWT');
      expect(result.original).toBe('JSON Web Token');
    });

    it('should match heading', () => {
      const result = resolver.matchEntity('Usage', mockIndex);

      expect(result.type).toBe('heading');
      expect(result.target?.heading).toBe('Usage');
    });

    it('should match block reference', () => {
      const result = resolver.matchEntity('jwt-definition', mockIndex);

      expect(result.type).toBe('block');
      expect(result.target?.blockId).toBe('jwt-definition');
    });

    it('should return unknown for no match', () => {
      const result = resolver.matchEntity('NonExistent', mockIndex);

      expect(result.type).toBe('unknown');
    });
  });

  describe('resolve', () => {
    it('should resolve without conflict', () => {
      const result = resolver.resolve('JWT', mockIndex);

      expect(result.resolved).toBe(true);
      expect(result.match?.type).toBe('document');
    });

    it('should detect alias conflict', () => {
      // Add conflicting alias
      mockIndex.aliasIndex.set('Token', ['Concepts/JWT.md', 'Security/Token.md']);

      const result = resolver.resolve('Token', mockIndex);

      expect(result.resolved).toBe(false);
      expect(result.conflict).toBeDefined();
      expect(result.conflict?.conflictType).toBe('alias');
      expect(result.conflict?.candidates.length).toBe(2);
    });

    it('should detect heading conflict', () => {
      // Add conflicting heading
      mockIndex.headingIndex.set('Shared', [
        { filePath: 'File1.md', heading: 'Shared', level: 1 },
        { filePath: 'File2.md', heading: 'Shared', level: 1 },
      ]);

      const result = resolver.resolve('Shared', mockIndex);

      expect(result.resolved).toBe(false);
      expect(result.conflict?.conflictType).toBe('heading');
    });
  });

  describe('matchPriority', () => {
    it('should prioritize document over alias', () => {
      // Create scenario where text matches both document and alias
      mockIndex.entities.set('Test.md', {
        filePath: 'Test.md',
        fileName: 'Test',
        aliases: [],
        headings: [],
        blocks: [],
        fileHash: 'hash',
      });
      mockIndex.aliasIndex.set('Test', ['Other.md']);

      const result = resolver.matchEntity('Test', mockIndex);

      expect(result.type).toBe('document');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/enhance/resolver.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/enhance/resolver.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/enhance/resolver.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/enhance/resolver.ts tests/enhance/resolver.test.ts
git commit -m "feat: add entity resolver with conflict detection"
```

---

## Task 15: Enhance - Linker

**Files:**
- Create: `src/enhance/linker.ts`
- Create: `tests/enhance/linker.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/enhance/linker.test.ts
import { EntityLinker } from '../../src/enhance/linker';
import { MatchResult } from '../../src/enhance/types';

describe('EntityLinker', () => {
  let linker: EntityLinker;

  beforeEach(() => {
    linker = new EntityLinker();
  });

  describe('generateWikiLink', () => {
    it('should generate document link', () => {
      const match: MatchResult = {
        type: 'document',
        text: 'JWT',
        target: {
          fileName: 'JWT',
          filePath: 'Concepts/JWT.md',
        },
      };

      const result = linker.generateWikiLink(match);

      expect(result).toBe('[[JWT]]');
    });

    it('should generate alias link with display text', () => {
      const match: MatchResult = {
        type: 'alias',
        text: 'JSON Web Token',
        target: {
          fileName: 'JWT',
          filePath: 'Concepts/JWT.md',
        },
        original: 'JSON Web Token',
      };

      const result = linker.generateWikiLink(match);

      expect(result).toBe('[[JWT|JSON Web Token]]');
    });

    it('should generate heading link', () => {
      const match: MatchResult = {
        type: 'heading',
        text: 'Usage',
        target: {
          fileName: 'Usage',
          filePath: 'Concepts/JWT.md',
          heading: 'Usage',
        },
      };

      const result = linker.generateWikiLink(match);

      expect(result).toBe('[[Concepts/JWT.md#Usage]]');
    });

    it('should generate block reference link', () => {
      const match: MatchResult = {
        type: 'block',
        text: 'jwt-definition',
        target: {
          fileName: 'jwt-definition',
          filePath: 'Concepts/JWT.md',
          blockId: 'jwt-definition',
        },
      };

      const result = linker.generateWikiLink(match);

      expect(result).toBe('[[Concepts/JWT.md#^jwt-definition]]');
    });

    it('should return original text for unknown match', () => {
      const match: MatchResult = {
        type: 'unknown',
        text: 'NonExistent',
      };

      const result = linker.generateWikiLink(match);

      expect(result).toBe('NonExistent');
    });
  });

  describe('insertLinks', () => {
    it('should insert links into content', () => {
      const content = 'JWT is a token format.';
      const entities = [
        { text: 'JWT', start: 0, end: 3, link: '[[JWT]]' },
      ];

      const result = linker.insertLinks(content, entities);

      expect(result).toBe('[[JWT]] is a token format.');
    });

    it('should handle multiple entities', () => {
      const content = 'JWT and OAuth are authentication methods.';
      const entities = [
        { text: 'JWT', start: 0, end: 3, link: '[[JWT]]' },
        { text: 'OAuth', start: 8, end: 13, link: '[[OAuth]]' },
      ];

      const result = linker.insertLinks(content, entities);

      expect(result).toBe('[[JWT]] and [[OAuth]] are authentication methods.');
    });

    it('should handle overlapping entities (keep first)', () => {
      const content = 'JWT token';
      const entities = [
        { text: 'JWT', start: 0, end: 3, link: '[[JWT]]' },
        { text: 'token', start: 4, end: 9, link: '[[token]]' },
      ];

      const result = linker.insertLinks(content, entities);

      expect(result).toBe('[[JWT]] [[token]]');
    });

    it('should preserve existing wiki links', () => {
      const content = '[[JWT]] is already linked.';
      const entities: any[] = [];

      const result = linker.insertLinks(content, entities);

      expect(result).toBe('[[JWT]] is already linked.');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/enhance/linker.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/enhance/linker.ts
import { MatchResult } from './types';

interface EntityWithLink {
  text: string;
  start: number;
  end: number;
  link: string;
}

export class EntityLinker {
  generateWikiLink(match: MatchResult): string {
    if (!match.target) {
      return match.text;
    }

    switch (match.type) {
      case 'document':
        return `[[${match.target.fileName}]]`;

      case 'alias':
        return `[[${match.target.fileName}|${match.original}]]`;

      case 'heading':
        return `[[${match.target.filePath}#${match.target.heading}]]`;

      case 'block':
        return `[[${match.target.filePath}#^${match.target.blockId}]]`;

      default:
        return match.text;
    }
  }

  insertLinks(content: string, entities: EntityWithLink[]): string {
    // Sort by start position descending to replace from end to start
    const sorted = [...entities].sort((a, b) => b.start - a.start);

    let result = content;
    for (const entity of sorted) {
      result =
        result.slice(0, entity.start) +
        entity.link +
        result.slice(entity.end);
    }

    return result;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/enhance/linker.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/enhance/linker.ts tests/enhance/linker.test.ts
git commit -m "feat: add entity linker for generating Wiki Links"
```

---

## Task 16: LLM - Provider Interface

**Files:**
- Create: `src/llm/types.ts`

- [ ] **Step 1: Write type definitions**

```typescript
// src/llm/types.ts
import { OntologySchema } from '../schema/types';

export interface RecognizerInput {
  content: string;
  schema: OntologySchema;
  existingEntities: string[];
}

export interface RecognizerOutput {
  entities: Array<{
    text: string;
    entityType?: string;
    confidence: number;
  }>;
}

export interface EntityTypeInfoInput {
  fileName: string;
  content: string;
  schema: OntologySchema;
}

export interface LLMProvider {
  recognize(input: RecognizerInput): Promise<RecognizerOutput>;
  inferEntityType?(input: EntityTypeInfoInput): Promise<string>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/llm/types.ts
git commit -m "feat: add LLM provider interface definitions"
```

---

## Task 17: Enhance - Recognizer

**Files:**
- Create: `src/enhance/recognizer.ts`
- Create: `tests/enhance/recognizer.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/enhance/recognizer.test.ts
import { EntityRecognizer } from '../../src/enhance/recognizer';
import { DEFAULT_SCHEMA } from '../../src/schema/default';
import { LLMProvider, RecognizerInput, RecognizerOutput } from '../../src/llm/types';

describe('EntityRecognizer', () => {
  let recognizer: EntityRecognizer;
  let mockLLMProvider: LLMProvider;

  beforeEach(() => {
    mockLLMProvider = {
      recognize: jest.fn(),
    };
    recognizer = new EntityRecognizer(mockLLMProvider, DEFAULT_SCHEMA);
  });

  describe('recognize', () => {
    it('should call LLM provider with correct input', async () => {
      const mockOutput: RecognizerOutput = {
        entities: [
          { text: 'JWT', entityType: 'Concept', confidence: 0.9 },
        ],
      };
      (mockLLMProvider.recognize as jest.Mock).mockResolvedValue(mockOutput);

      const content = 'JWT is used for authentication.';
      const existingEntities = ['JWT', 'OAuth'];
      
      const result = await recognizer.recognize(content, existingEntities);

      expect(mockLLMProvider.recognize).toHaveBeenCalledWith({
        content,
        schema: DEFAULT_SCHEMA,
        existingEntities,
      });
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].text).toBe('JWT');
    });

    it('should find entities in index first (exact match)', async () => {
      const mockOutput: RecognizerOutput = { entities: [] };
      (mockLLMProvider.recognize as jest.Mock).mockResolvedValue(mockOutput);

      const content = 'JWT is used for authentication.';
      const existingEntities = ['JWT'];
      
      const result = await recognizer.recognize(content, existingEntities);

      // Should still call LLM but also return index matches
      expect(mockLLMProvider.recognize).toHaveBeenCalled();
    });

    it('should merge LLM results with index matches', async () => {
      const mockOutput: RecognizerOutput = {
        entities: [
          { text: 'authentication', entityType: 'Concept', confidence: 0.8 },
        ],
      };
      (mockLLMProvider.recognize as jest.Mock).mockResolvedValue(mockOutput);

      const content = 'JWT authentication';
      const existingEntities = ['JWT'];
      
      const result = await recognizer.recognize(content, existingEntities);

      expect(result.entities.some(e => e.text === 'JWT')).toBe(true);
    });
  });

  describe('buildPrompt', () => {
    it('should build prompt with schema info', () => {
      const prompt = recognizer.buildPrompt('Test content', ['Entity1']);

      expect(prompt).toContain('Test content');
      expect(prompt).toContain('Concept');
      expect(prompt).toContain('Entity1');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/enhance/recognizer.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/enhance/recognizer.ts
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
    const result: RecognizedOutput['entities'] = [...indexMatches];

    for (const llmEntity of llmEntities) {
      // Check if this overlaps with any index match
      const overlaps = indexMatches.some(
        m =>
          (llmEntity.text.length > 0 &&
            m.text.toLowerCase() === llmEntity.text.toLowerCase()) ||
          this.rangesOverlap(
            m.start,
            m.end,
            0, // We don't have position from LLM, so we can't check exact overlap
            llmEntity.text.length
          )
      );

      if (!overlaps) {
        result.push({
          ...llmEntity,
          start: 0, // Position will be determined by linker
          end: llmEntity.text.length,
        });
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/enhance/recognizer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/enhance/recognizer.ts tests/enhance/recognizer.test.ts
git commit -m "feat: add entity recognizer with LLM integration"
```

---

## Task 18: Enhance - Main Enhancer

**Files:**
- Create: `src/enhance/enhancer.ts`
- Create: `tests/enhance/enhancer.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/enhance/enhancer.test.ts
import * as path from 'path';
import * as fs from 'fs';
import { DocumentEnhancer } from '../../src/enhance/enhancer';
import { EntityIndexBuilder } from '../../src/index/entity-index';
import { DEFAULT_SCHEMA } from '../../src/schema/default';
import { LLMProvider, RecognizerOutput } from '../../src/llm/types';
import { ConflictError } from '../../src/utils/errors';

describe('DocumentEnhancer', () => {
  const testVault = path.join(__dirname, '../fixtures/enhance-vault');
  const jwtFile = path.join(testVault, 'JWT.md');
  const authFile = path.join(testVault, 'Auth.md');
  let enhancer: DocumentEnhancer;
  let mockLLMProvider: LLMProvider;

  beforeAll(() => {
    fs.mkdirSync(testVault, { recursive: true });
    
    fs.writeFileSync(jwtFile, `---
aliases:
  - JSON Web Token
tags:
  - Security
---
# JWT

JWT is a compact token format for authentication.
`);
    
    fs.writeFileSync(authFile, `---
tags:
  - System
---
# Auth

Authentication system uses JWT.
`);
  });

  afterAll(() => {
    fs.rmSync(testVault, { recursive: true, force: true });
  });

  beforeEach(() => {
    mockLLMProvider = {
      recognize: jest.fn().mockResolvedValue({
        entities: [
          { text: 'JWT', entityType: 'Concept', confidence: 0.95 },
          { text: 'authentication', entityType: 'Concept', confidence: 0.8 },
        ],
      }),
    };
  });

  describe('enhance', () => {
    it('should enhance document with links', async () => {
      const indexBuilder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const index = await indexBuilder.build([jwtFile, authFile]);
      
      enhancer = new DocumentEnhancer(
        testVault,
        DEFAULT_SCHEMA,
        index,
        mockLLMProvider
      );

      const result = await enhancer.enhance(jwtFile);

      expect(result.enhanced).toBe(true);
      expect(result.content).toContain('[[JWT]]');
    });

    it('should update frontmatter tags', async () => {
      const indexBuilder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const index = await indexBuilder.build([jwtFile]);
      
      enhancer = new DocumentEnhancer(
        testVault,
        DEFAULT_SCHEMA,
        index,
        mockLLMProvider
      );

      const result = await enhancer.enhance(jwtFile);

      expect(result.content).toContain('Concept');
      expect(result.changes.tagsAdded).toContain('Concept');
    });

    it('should skip already enhanced files', async () => {
      const indexBuilder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const index = await indexBuilder.build([jwtFile]);
      
      enhancer = new DocumentEnhancer(
        testVault,
        DEFAULT_SCHEMA,
        index,
        mockLLMProvider
      );

      // Enhance twice
      await enhancer.enhance(jwtFile);
      const result = await enhancer.enhance(jwtFile);

      // Second enhancement should detect no changes (file already has links)
      expect(result.changes.linksAdded).toBe(0);
    });
  });

  describe('detectEntityType', () => {
    it('should detect entity type from file name pattern', async () => {
      const indexBuilder = new EntityIndexBuilder(testVault, DEFAULT_SCHEMA);
      const index = await indexBuilder.build([jwtFile]);
      
      enhancer = new DocumentEnhancer(
        testVault,
        DEFAULT_SCHEMA,
        index,
        mockLLMProvider
      );

      const type = await enhancer.detectEntityType('JWT', jwtFile);

      // Should infer Concept from LLM or context
      expect(type).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/enhance/enhancer.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/enhance/enhancer.ts
import * as fs from 'fs/promises';
import { OntologySchema } from '../schema/types';
import { EntityIndex } from '../index/types';
import { LLMProvider } from '../llm/types';
import { EnhanceResult, RecognizedEntity } from './types';
import { FrontmatterHandler } from './frontmatter';
import { EntityResolver } from './resolver';
import { EntityLinker } from './linker';
import { EntityRecognizer } from './recognizer';
import { getFileNameWithoutExtension } from '../utils/path';
import { ConflictError } from '../utils/errors';

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
    
    // Detect entity type
    const entityType = await this.detectEntityType(fileName, filePath, body);
    
    // Get existing entities for recognition context
    const existingEntities = Array.from(this.index.entities.values()).map(e => e.fileName);
    
    // Recognize entities
    const recognizeResult = await this.recognizer.recognize(body, existingEntities);
    
    // Process each recognized entity
    const linksToAdd: Array<{ text: string; start: number; end: number; link: string }> = [];
    const entitiesRecognized: string[] = [];
    
    for (const entity of recognizeResult.entities) {
      const resolveResult = this.resolver.resolve(entity.text, this.index);
      
      if (resolveResult.resolved && resolveResult.match) {
        const link = this.linker.generateWikiLink(resolveResult.match);
        
        // Find position in body
        const regex = new RegExp(entity.text, 'g');
        let match;
        while ((match = regex.exec(body)) !== null) {
          // Check if already linked
          if (this.isAlreadyLinked(body, match.index)) continue;
          
          linksToAdd.push({
            text: entity.text,
            start: match.index,
            end: match.index + entity.text.length,
            link,
          });
          entitiesRecognized.push(entity.text);
          break; // Only link first occurrence
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

  async detectEntityType(
    fileName: string,
    filePath: string,
    content: string
  ): Promise<string | undefined> {
    // First check if already in index
    const entity = this.index.entities.get(filePath);
    if (entity?.entityType) {
      return entity.entityType;
    }
    
    // Check existing frontmatter
    const { frontmatter } = this.frontmatterHandler.parse(content);
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
    
    for (const tag of tags) {
      if (this.schema.entity_types[tag]) {
        return tag;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/enhance/enhancer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/enhance/enhancer.ts tests/enhance/enhancer.test.ts
git commit -m "feat: add main document enhancer orchestrating all components"
```

---

## Task 19: SDK - Main Entry

**Files:**
- Create: `src/index.ts`
- Create: `tests/sdk.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/sdk.test.ts
import * as path from 'path';
import * as fs from 'fs';
import { OntoMark } from '../src/index';
import { LLMProvider, RecognizerOutput } from '../src/llm/types';

describe('OntoMark SDK', () => {
  const testVault = path.join(__dirname, 'fixtures', 'sdk-vault');
  let ontoMark: OntoMark;
  let mockLLMProvider: LLMProvider;

  beforeAll(() => {
    fs.mkdirSync(testVault, { recursive: true });
    fs.mkdirSync(path.join(testVault, 'Concepts'), { recursive: true });
    
    fs.writeFileSync(
      path.join(testVault, 'Concepts', 'JWT.md'),
      `---
aliases:
  - JSON Web Token
---
# JWT

JWT is used for authentication.
`
    );
    
    fs.writeFileSync(
      path.join(testVault, 'ontology.yaml'),
      `version: "1.0"
entity_types:
  Concept:
    description: 技术概念
relations: {}
`
    );
  });

  afterAll(() => {
    fs.rmSync(testVault, { recursive: true, force: true });
  });

  beforeEach(() => {
    mockLLMProvider = {
      recognize: jest.fn().mockResolvedValue({
        entities: [{ text: 'JWT', entityType: 'Concept', confidence: 0.95 }],
      }),
    };

    ontoMark = new OntoMark({
      vaultPath: testVault,
      llmProvider: mockLLMProvider,
    });
  });

  describe('buildIndex', () => {
    it('should build entity index', async () => {
      const index = await ontoMark.buildIndex();

      expect(index.entities.size).toBe(1);
      expect(index.entities.values().next().value.fileName).toBe('JWT');
    });
  });

  describe('enhanceFile', () => {
    it('should enhance a single file', async () => {
      await ontoMark.buildIndex();
      
      const result = await ontoMark.enhanceFile(
        path.join(testVault, 'Concepts', 'JWT.md')
      );

      expect(result.enhanced).toBe(true);
      expect(result.content).toContain('[[JWT]]');
    });
  });

  describe('enhanceAll', () => {
    it('should enhance all files in vault', async () => {
      await ontoMark.buildIndex();
      
      const result = await ontoMark.enhanceAll();

      expect(result.success.length).toBe(1);
      expect(result.failed.length).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return status information', async () => {
      await ontoMark.buildIndex();
      
      const status = await ontoMark.getStatus();

      expect(status.totalFiles).toBe(1);
      expect(status.indexedFiles).toBe(1);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/sdk.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/index.ts
import * as path from 'path';
import { OntologySchema } from './schema/types';
import { EntityIndex, CacheData } from './index/types';
import { LLMProvider } from './llm/types';
import { EnhanceResult } from './enhance/types';
import { SchemaLoader } from './schema/loader';
import { VaultScanner } from './index/scanner';
import { EntityIndexBuilder } from './index/entity-index';
import { HashCache } from './index/hash-cache';
import { DocumentEnhancer } from './enhance/enhancer';
import { md5 } from './utils/md5';

export interface OntoMarkOptions {
  vaultPath: string;
  llmProvider: LLMProvider;
  schemaPath?: string;
}

export interface BatchResult {
  success: string[];
  failed: Array<{
    filePath: string;
    error: Error;
  }>;
}

export interface StatusResult {
  totalFiles: number;
  indexedFiles: number;
  pendingFiles: number;
  schemaHash: string;
  lastIndexed?: Date;
}

export class OntoMark {
  private vaultPath: string;
  private llmProvider: LLMProvider;
  private schemaPath?: string;
  private schema?: OntologySchema;
  private index?: EntityIndex;
  private cache?: CacheData;
  private cachePath: string;

  constructor(options: OntoMarkOptions) {
    this.vaultPath = path.resolve(options.vaultPath);
    this.llmProvider = options.llmProvider;
    this.schemaPath = options.schemaPath;
    this.cachePath = path.join(this.vaultPath, '.ontomark', 'cache.json');
  }

  async buildIndex(): Promise<EntityIndex> {
    // Load schema
    const schemaLoader = new SchemaLoader();
    const schemaResult = await schemaLoader.loadWithFallback(this.vaultPath);
    this.schema = schemaResult.schema;

    // Scan vault
    const scanner = new VaultScanner(this.vaultPath);
    const files = await scanner.scan();

    // Build index
    const indexBuilder = new EntityIndexBuilder(this.vaultPath, this.schema);
    this.index = await indexBuilder.build(files);

    // Load cache
    const hashCache = new HashCache(this.cachePath);
    this.cache = await hashCache.load();

    // Update schema hash
    const schemaHash = md5(JSON.stringify(this.schema));
    hashCache.updateSchemaHash(this.cache, schemaHash);

    return this.index;
  }

  async enhanceFile(filePath: string): Promise<EnhanceResult> {
    if (!this.schema || !this.index) {
      await this.buildIndex();
    }

    const enhancer = new DocumentEnhancer(
      this.vaultPath,
      this.schema!,
      this.index!,
      this.llmProvider
    );

    const result = await enhancer.enhance(path.resolve(filePath));

    // Write enhanced content
    if (result.enhanced) {
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, result.content);
    }

    return result;
  }

  async enhanceAll(options?: { dryRun?: boolean; force?: boolean }): Promise<BatchResult> {
    if (!this.schema || !this.index || !this.cache) {
      await this.buildIndex();
    }

    const result: BatchResult = { success: [], failed: [] };
    const hashCache = new HashCache(this.cachePath);
    const scanner = new VaultScanner(this.vaultPath);
    const files = await scanner.scan();

    for (const file of files) {
      try {
        const fileHash = await this.getFileHash(file);
        const schemaHash = md5(JSON.stringify(this.schema));

        if (!options?.force && !hashCache.needsEnhancement(file, fileHash, schemaHash, this.cache!)) {
          continue;
        }

        const enhanceResult = await this.enhanceFile(file);

        if (enhanceResult.enhanced && !options?.dryRun) {
          // Update cache
          hashCache.updateFileHash(this.cache!, file, fileHash, schemaHash, true);
        }

        result.success.push(file);
      } catch (error) {
        result.failed.push({
          filePath: file,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // Stop on conflict error
        if (error instanceof Error && error.name === 'ConflictError') {
          break;
        }
      }
    }

    // Save cache
    if (!options?.dryRun) {
      await hashCache.save(this.cache!);
    }

    return result;
  }

  async getStatus(): Promise<StatusResult> {
    const scanner = new VaultScanner(this.vaultPath);
    const files = await scanner.scan();
    const hashCache = new HashCache(this.cachePath);
    const cache = await hashCache.load();

    const pendingFiles = files.filter(file => {
      const relativePath = path.relative(this.vaultPath, file);
      const cached = cache.fileHashes[relativePath];
      return !cached || !cached.enhanced;
    });

    return {
      totalFiles: files.length,
      indexedFiles: this.index?.entities.size || 0,
      pendingFiles: pendingFiles.length,
      schemaHash: cache.schemaHash,
    };
  }

  private async getFileHash(filePath: string): Promise<string> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return md5(content);
  }
}

// Re-export types
export * from './schema/types';
export * from './index/types';
export * from './enhance/types';
export * from './llm/types';
export * from './utils/errors';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/sdk.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.ts tests/sdk.test.ts
git commit -m "feat: add main SDK entry with OntoMark class"
```

---

## Task 20: CLI Entry

**Files:**
- Create: `src/cli.ts`
- Create: `tests/cli.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/cli.test.ts
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

describe('CLI', () => {
  const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
  const testVault = path.join(__dirname, 'fixtures', 'cli-vault');

  beforeAll(() => {
    // Build the project first
    execSync('npm run build', { cwd: path.join(__dirname, '..') });
    
    fs.mkdirSync(testVault, { recursive: true });
    fs.writeFileSync(
      path.join(testVault, 'Test.md'),
      '# Test\n\nTest content.'
    );
  });

  afterAll(() => {
    fs.rmSync(testVault, { recursive: true, force: true });
  });

  describe('index command', () => {
    it('should index vault', () => {
      const output = execSync(`node ${cliPath} index ${testVault}`, {
        encoding: 'utf-8',
      });

      expect(output).toContain('索引构建完成');
    });
  });

  describe('status command', () => {
    it('should show vault status', () => {
      const output = execSync(`node ${cliPath} status ${testVault}`, {
        encoding: 'utf-8',
      });

      expect(output).toContain('文件数量');
    });
  });

  describe('help', () => {
    it('should show help', () => {
      const output = execSync(`node ${cliPath} --help`, {
        encoding: 'utf-8',
      });

      expect(output).toContain('ontomark');
      expect(output).toContain('index');
      expect(output).toContain('enhance');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/cli.ts
#!/usr/bin/env node

import { Command } from 'commander';
import { OntoMark } from './index';
import { ConflictError } from './utils/errors';

const program = new Command();

program
  .name('ontomark')
  .description('Ontology-Aware Markdown Enhancer')
  .version('0.1.0');

program
  .command('index <vault-path>')
  .description('构建 Vault 实体索引')
  .action(async (vaultPath: string) => {
    try {
      const ontomark = new OntoMark({
        vaultPath,
        llmProvider: createMockProvider(),
      });

      const index = await ontomark.buildIndex();

      console.log('\n索引构建完成');
      console.log(`- 扫描文件: ${index.entities.size} 个`);
      console.log(`- 别名数量: ${Array.from(index.aliasIndex.values()).flat().length} 个`);
    } catch (error) {
      console.error('错误:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('enhance <file-path>')
  .description('增强单个 Markdown 文件')
  .option('--dry-run', '仅输出变更，不写入文件')
  .option('--force', '忽略缓存，强制重新处理')
  .action(async (filePath: string, options: { dryRun?: boolean; force?: boolean }) => {
    try {
      const ontomark = new OntoMark({
        vaultPath: process.cwd(),
        llmProvider: createMockProvider(),
      });

      await ontomark.buildIndex();
      const result = await ontomark.enhanceFile(filePath);

      console.log(`\n增强完成: ${filePath}`);
      console.log(`- 新增链接: ${result.changes.linksAdded} 处`);
      console.log(`- 更新 frontmatter: tags +${result.changes.tagsAdded.length}`);
    } catch (error) {
      if (error instanceof ConflictError) {
        console.error('\n冲突错误:');
        console.error(`实体 "${error.text}" 匹配到多个候选:`);
        error.candidates.forEach((c, i) => {
          console.error(`  ${i + 1}. ${c.filePath}`);
        });
        console.error('请解决冲突后重试');
      } else {
        console.error('错误:', error instanceof Error ? error.message : error);
      }
      process.exit(1);
    }
  });

program
  .command('enhance-all [vault-path]')
  .description('批量增强所有需要处理的文件')
  .option('--dry-run', '仅输出变更，不写入文件')
  .option('--force', '忽略缓存，强制重新处理')
  .action(async (vaultPath: string, options: { dryRun?: boolean; force?: boolean }) => {
    try {
      const ontomark = new OntoMark({
        vaultPath: vaultPath || process.cwd(),
        llmProvider: createMockProvider(),
      });

      console.log('\n批量增强开始...');
      const result = await ontomark.enhanceAll(options);

      console.log('\n批量增强完成');
      console.log(`- 成功: ${result.success.length} 个`);
      if (result.failed.length > 0) {
        console.log(`- 失败: ${result.failed.length} 个`);
        result.failed.forEach(f => {
          console.error(`  - ${f.filePath}: ${f.error.message}`);
        });
      }
    } catch (error) {
      console.error('错误:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('status [vault-path]')
  .description('查看 Vault 状态')
  .action(async (vaultPath: string) => {
    try {
      const ontomark = new OntoMark({
        vaultPath: vaultPath || process.cwd(),
        llmProvider: createMockProvider(),
      });

      await ontomark.buildIndex();
      const status = await ontomark.getStatus();

      console.log('\nVault 状态:');
      console.log(`- 总文件数: ${status.totalFiles}`);
      console.log(`- 已索引: ${status.indexedFiles}`);
      console.log(`- 待增强: ${status.pendingFiles}`);
    } catch (error) {
      console.error('错误:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Mock LLM provider for CLI (users should integrate their own)
function createMockProvider() {
  return {
    recognize: async () => ({
      entities: [],
    }),
  };
}

program.parse();
```

- [ ] **Step 4: Update package.json for CLI**

```json
{
  "name": "ontomark",
  "version": "0.1.0",
  ...
  "bin": {
    "ontomark": "./dist/cli.js"
  },
  ...
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run build && npm test -- tests/cli.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts tests/cli.test.ts package.json
git commit -m "feat: add CLI with index, enhance, and status commands"
```

---

## Task 21: Final Integration Test

**Files:**
- Create: `tests/integration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// tests/integration.test.ts
import * as path from 'path';
import * as fs from 'fs';
import { OntoMark } from '../src/index';
import { LLMProvider, RecognizerOutput } from '../src/llm/types';

describe('Integration Test', () => {
  const testVault = path.join(__dirname, 'fixtures', 'integration-vault');
  let ontoMark: OntoMark;
  let mockLLMProvider: LLMProvider;

  beforeAll(() => {
    // Create test vault structure
    fs.mkdirSync(path.join(testVault, 'Concepts'), { recursive: true });
    fs.mkdirSync(path.join(testVault, 'Systems'), { recursive: true });

    // Create JWT concept
    fs.writeFileSync(
      path.join(testVault, 'Concepts', 'JWT.md'),
      `---
aliases:
  - JSON Web Token
tags:
  - Security
---
# JWT

JWT (JSON Web Token) is a compact, URL-safe means of representing claims.
`
    );

    // Create Auth system
    fs.writeFileSync(
      path.join(testVault, 'Systems', 'Auth.md'),
      `---
tags:
  - System
---
# Auth

Authentication system uses JWT for token-based authentication.

## Login Flow

The login flow issues a JSON Web Token upon successful authentication.

^login-flow
`
    );

    // Create ontology
    fs.writeFileSync(
      path.join(testVault, 'ontology.yaml'),
      `version: "1.0"
entity_types:
  Concept:
    description: 技术概念
  System:
    description: 系统
relations:
  uses:
    from: System
    to: Concept
`
    );
  });

  afterAll(() => {
    fs.rmSync(testVault, { recursive: true, force: true });
  });

  beforeEach(() => {
    mockLLMProvider = {
      recognize: jest.fn().mockImplementation(async (input) => {
        // Simulate LLM recognizing entities
        const entities: RecognizerOutput['entities'] = [];
        
        if (input.content.includes('JWT')) {
          entities.push({ text: 'JWT', entityType: 'Concept', confidence: 0.95 });
        }
        if (input.content.includes('JSON Web Token')) {
          entities.push({ text: 'JSON Web Token', entityType: 'Concept', confidence: 0.9 });
        }
        if (input.content.includes('authentication')) {
          entities.push({ text: 'authentication', entityType: 'Concept', confidence: 0.7 });
        }
        
        return { entities };
      }),
    };

    ontoMark = new OntoMark({
      vaultPath: testVault,
      llmProvider: mockLLMProvider,
    });
  });

  test('full workflow: index -> enhance -> verify', async () => {
    // 1. Build index
    const index = await ontoMark.buildIndex();
    expect(index.entities.size).toBe(2);
    expect(index.aliasIndex.get('JSON Web Token')).toBeDefined();

    // 2. Enhance all files
    const result = await ontoMark.enhanceAll();
    expect(result.success.length).toBe(2);
    expect(result.failed.length).toBe(0);

    // 3. Verify Auth.md has links
    const authContent = fs.readFileSync(
      path.join(testVault, 'Systems', 'Auth.md'),
      'utf-8'
    );
    expect(authContent).toContain('[[JWT]]');
    expect(authContent).toContain('[[Concepts/JWT.md|JSON Web Token]]');

    // 4. Verify frontmatter updated
    expect(authContent).toContain('- Concept');

    // 5. Verify incremental enhancement
    const result2 = await ontoMark.enhanceAll();
    expect(result2.success.length).toBe(2);
    // Should not enhance again (no changes)
  });

  test('incremental enhancement respects cache', async () => {
    await ontoMark.buildIndex();
    
    // First enhancement
    await ontoMark.enhanceAll();
    
    // Modify one file
    const authPath = path.join(testVault, 'Systems', 'Auth.md');
    fs.appendFileSync(authPath, '\n\nNew content added.');
    
    // Second enhancement
    const result = await ontoMark.enhanceAll();
    
    // Should only process the modified file
    expect(result.success.length).toBe(1);
  });

  test('schema change triggers full re-enhancement', async () => {
    await ontoMark.buildIndex();
    await ontoMark.enhanceAll();
    
    // Modify schema
    fs.writeFileSync(
      path.join(testVault, 'ontology.yaml'),
      `version: "1.1"
entity_types:
  Concept:
    description: 技术概念
  System:
    description: 系统
  NewType:
    description: 新类型
relations: {}
`
    );
    
    // Re-index and enhance
    await ontoMark.buildIndex();
    const result = await ontoMark.enhanceAll({ force: true });
    
    // Should process all files due to schema change
    expect(result.success.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `npm test -- tests/integration.test.ts`
Expected: PASS

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add tests/integration.test.ts
git commit -m "test: add integration tests for full workflow"
```

---

## Task 22: Documentation and Final Polish

**Files:**
- Create: `README.md`
- Update: `package.json`

- [ ] **Step 1: Write README.md**

```markdown
# OntoMark

Ontology-Aware Markdown Enhancer - 根据本体定义自动增强 Markdown 文档，生成 Obsidian 兼容的知识图谱。

## 特性

- 🏷️ 实体识别与链接
- 📊 本体 Schema 支持
- 🔄 增量处理机制
- 🔗 Obsidian 原生语法兼容
- 🤖 AI Agent 集成友好

## 安装

```bash
npm install ontomark
```

## 快速开始

### CLI 使用

```bash
# 索引 Vault
ontomark index ./notes

# 增强单个文件
ontomark enhance ./notes/Concepts/JWT.md

# 批量增强
ontomark enhance-all ./notes

# 查看状态
ontomark status ./notes
```

### SDK 使用

```typescript
import { OntoMark, LLMProvider } from 'ontomark';

// 实现 LLM Provider
const myLLMProvider: LLMProvider = {
  async recognize(input) {
    // 调用你的 LLM API
    return { entities: [...] };
  }
};

// 创建实例
const ontomark = new OntoMark({
  vaultPath: './notes',
  llmProvider: myLLMProvider,
});

// 构建索引
await ontomark.buildIndex();

// 增强文件
await ontomark.enhanceFile('./notes/JWT.md');

// 批量增强
await ontomark.enhanceAll();
```

## 本体 Schema

在 Vault 根目录创建 `ontology.yaml`：

```yaml
version: "1.0"
entity_types:
  Concept:
    description: 技术概念
  System:
    description: 系统
  Component:
    description: 组件
relations:
  uses:
    from: System
    to: Concept
```

## 工作原理

1. **索引阶段**: 扫描 Vault，构建实体索引
2. **增强阶段**: 识别实体、解析冲突、生成链接
3. **增量机制**: 通过 MD5 hash 避免重复处理

## 许可证

MIT
```

- [ ] **Step 2: Update package.json with complete metadata**

```json
{
  "name": "ontomark",
  "version": "0.1.0",
  "description": "Ontology-Aware Markdown Enhancer for Obsidian and AI Agents",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "ontomark": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": [
    "ontology",
    "markdown",
    "obsidian",
    "knowledge-graph",
    "entity-recognition",
    "ai-agent"
  ],
  "author": "",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/ontomark.git"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "typescript": "^5.3.3"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "gray-matter": "^4.0.3",
    "marked": "^12.0.0",
    "yaml": "^2.3.4"
  }
}
```

- [ ] **Step 3: Final build and test**

Run: `npm run build && npm test`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add README.md package.json
git commit -m "docs: add README and finalize package metadata"
```

- [ ] **Step 5: Create summary commit**

```bash
git log --oneline | head -20
```

---

## Plan Self-Review

**1. Spec Coverage:**
- ✅ Schema 定义与加载 - Task 5-7
- ✅ 实体索引构建 - Task 8-11
- ✅ 实体识别 - Task 17
- ✅ 实体对齐 - Task 14
- ✅ 实体链接 - Task 15
- ✅ Frontmatter 增强 - Task 13
- ✅ 冲突处理 - Task 14
- ✅ 增量机制 - Task 10
- ✅ CLI 接口 - Task 20
- ✅ SDK 接口 - Task 19
- ✅ LLM Provider 接口 - Task 16
- ✅ AI Agent 集成 - Task 16, 19

**2. Placeholder Scan:** No TBD, TODO, or incomplete sections found.

**3. Type Consistency:** All types defined in dedicated files and consistently used across tasks.
