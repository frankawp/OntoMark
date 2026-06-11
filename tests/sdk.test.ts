import * as path from 'path';
import * as fs from 'fs';
import { OntoMark } from '../src/index';
import { LLMProvider, RecognizerInput, RecognizerOutput } from '../src/llm/types';

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
      recognize: jest.fn().mockImplementation(async (input: RecognizerInput) => {
        // 返回识别结果，模拟识别到 JWT 实体
        return {
          entities: [{ text: 'JWT', entityType: 'Concept', confidence: 0.95 }],
        } as RecognizerOutput;
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
      expect(index.entities.values().next().value!.fileName).toBe('JWT');
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

      expect(result.success.length).toBeGreaterThanOrEqual(1);
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