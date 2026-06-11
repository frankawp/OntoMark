import * as path from 'path';
import * as fs from 'fs';
import { DocumentEnhancer } from '../../src/enhance/enhancer';
import { EntityIndexBuilder } from '../../src/index/entity-index';
import { DEFAULT_SCHEMA } from '../../src/schema/default';
import { LLMProvider, RecognizerOutput } from '../../src/llm/types';

describe('DocumentEnhancer', () => {
  const testVault = path.join(__dirname, '../fixtures/enhance-vault');
  const jwtFile = path.join(testVault, 'JWT.md');
  const authFile = path.join(testVault, 'Auth.md');
  let enhancer: DocumentEnhancer;
  let mockLLMProvider: LLMProvider;

  const originalJwtContent = `---
aliases:
  - JSON Web Token
tags:
  - Security
---
# JWT

JWT is a compact token format for authentication.
`;

  const originalAuthContent = `---
tags:
  - System
---
# Auth

Authentication system uses JWT.
`;

  beforeAll(() => {
    fs.mkdirSync(testVault, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(testVault, { recursive: true, force: true });
  });

  beforeEach(() => {
    // Reset test files before each test
    fs.writeFileSync(jwtFile, originalJwtContent);
    fs.writeFileSync(authFile, originalAuthContent);

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

      const content = await fs.promises.readFile(jwtFile, 'utf-8');
      const type = await enhancer.detectEntityType('JWT', jwtFile, content);

      // Should infer Concept from LLM or context
      expect(type).toBeDefined();
    });
  });
});