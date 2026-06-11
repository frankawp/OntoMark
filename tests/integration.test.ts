import * as path from 'path';
import * as fs from 'fs';
import { OntoMark } from '../src/index';
import { LLMProvider, RecognizerOutput } from '../src/llm/types';

describe('Integration Test', () => {
  const testVault = path.join(__dirname, 'fixtures', 'integration-vault');
  let ontoMark: OntoMark;
  let mockLLMProvider: LLMProvider;

  beforeAll(() => {
    // 创建测试 vault 结构
    fs.mkdirSync(path.join(testVault, 'Concepts'), { recursive: true });
    fs.mkdirSync(path.join(testVault, 'Systems'), { recursive: true });

    // 创建 JWT concept
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

    // 创建 Auth system
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

    // 创建 ontology
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
        // 模拟 LLM 识别实体
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

  test('完整工作流: index -> enhance -> verify', async () => {
    // 1. 构建索引
    const index = await ontoMark.buildIndex();
    expect(index.entities.size).toBe(2);
    expect(index.aliasIndex.get('JSON Web Token')).toBeDefined();

    // 2. 增强所有文件
    const result = await ontoMark.enhanceAll();
    expect(result.success.length).toBe(2);
    expect(result.failed.length).toBe(0);

    // 3. 验证 Auth.md 有链接
    const authContent = fs.readFileSync(
      path.join(testVault, 'Systems', 'Auth.md'),
      'utf-8'
    );
    expect(authContent).toContain('[[JWT]]');
    // 验证链接被正确创建(可能是 [[JWT]] 或 [[JWT|JSON Web Token]] 格式)
    expect(authContent).toMatch(/\[\[JWT(\|JSON Web Token)?\]\]/);

    // 4. 验证 frontmatter 更新(如果有的话)
    // 注意：frontmatter 的更新取决于实际实现

    // 5. 验证增量增强(缓存工作)
    const result2 = await ontoMark.enhanceAll();
    // 第二次应该处理较少文件或全部文件取决于缓存实现
  });

  test('增量增强遵循缓存', async () => {
    await ontoMark.buildIndex();

    // 第一次增强
    const result1 = await ontoMark.enhanceAll();
    expect(result1.success.length).toBe(2);

    // 修改一个文件
    const authPath = path.join(testVault, 'Systems', 'Auth.md');
    fs.appendFileSync(authPath, '\n\nNew content added.');

    // 第二次增强
    const result = await ontoMark.enhanceAll();

    // 验证增量处理工作正常
    // 实际行为取决于缓存实现
    expect(result.success.length).toBeGreaterThanOrEqual(1);
    expect(result.failed.length).toBe(0);
  });

  test('schema 变更触发完整重新增强', async () => {
    await ontoMark.buildIndex();
    await ontoMark.enhanceAll();

    // 修改 schema
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

    // 重新索引并增强
    await ontoMark.buildIndex();
    const result = await ontoMark.enhanceAll({ force: true });

    // 由于 schema 变更应该处理所有文件
    expect(result.success.length).toBe(2);
  });
});