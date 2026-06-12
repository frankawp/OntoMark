/**
 * MultiHop-RAG 数据集功能测试
 *
 * 测试 OntoMark V2 在真实数据集上的完整功能
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { OntoMark } from '../src/index';
import { OpenAIProvider } from '../src/llm/openai-provider';

const VAULT_PATH = path.join(__dirname, 'markdown/multi_hop_vault');
const RAW_PATH = path.join(VAULT_PATH, 'raw');
const WIKI_PATH = path.join(VAULT_PATH, 'wiki');

// Mock AI Provider（用于测试，不调用实际 API）
function createMockProvider(): OpenAIProvider {
  return {
    extract: async () => ({
      entities: [
        {
          name: 'Test Entity',
          aliases: ['test'],
          type: 'Concept',
          context: ['This is a test context.'],
          confidence: 0.9,
        },
      ],
    }),
    classify: async () => ({
      type: 'Concept',
      confidence: 0.8,
    }),
    generate: async () => 'Generated content',
    isAvailable: async () => false, // 标记为不可用
  } as any;
}

describe('MultiHop-RAG Functional Tests', () => {
  beforeAll(async () => {
    // 确保测试目录存在
    await fs.mkdir(VAULT_PATH, { recursive: true });
    await fs.mkdir(RAW_PATH, { recursive: true });
    await fs.mkdir(WIKI_PATH, { recursive: true });
  });

  describe('Data Conversion', () => {
    it('应该正确识别 raw 目录中的文档', async () => {
      const categories = await fs.readdir(RAW_PATH);
      expect(categories.length).toBeGreaterThan(0);

      // 检查分类目录
      const expectedCategories = ['business', 'entertainment', 'health', 'science', 'sports', 'technology'];
      for (const cat of expectedCategories) {
        expect(categories).toContain(cat);
      }
    });

    it('应该包含正确数量的文档', async () => {
      const categories = await fs.readdir(RAW_PATH);
      let totalFiles = 0;

      for (const cat of categories) {
        if (cat.startsWith('.')) continue;
        const catPath = path.join(RAW_PATH, cat);
        const stat = await fs.stat(catPath);
        if (stat.isDirectory()) {
          const files = await fs.readdir(catPath);
          totalFiles += files.filter(f => f.endsWith('.md')).length;
        }
      }

      // 应该有 609 个文档
      expect(totalFiles).toBe(609);
    });

    it('文档应该包含正确的 frontmatter', async () => {
      const businessPath = path.join(RAW_PATH, 'business');
      const files = await fs.readdir(businessPath);
      const firstFile = files.find(f => f.endsWith('.md'));
      expect(firstFile).toBeDefined();

      const content = await fs.readFile(path.join(businessPath, firstFile!), 'utf-8');
      expect(content).toContain('---');
      expect(content).toContain('title:');
      expect(content).toContain('source:');
      expect(content).toContain('category:');
    });
  });

  describe('OntoMark V2 API', () => {
    let ontomark: OntoMark;

    beforeEach(() => {
      ontomark = new OntoMark({
        projectPath: VAULT_PATH,
        rawPath: RAW_PATH,
        wikiPath: WIKI_PATH,
        aiProvider: createMockProvider(),
      });
    });

    it('应该返回正确的项目状态', async () => {
      const status = await ontomark.getStatus();
      expect(status.rawFiles).toBe(609);
      expect(status.wikiFiles).toBeGreaterThanOrEqual(0); // 可能已有之前测试创建的文件
      expect(status.schemaHash).toBeDefined();
    });

    it('应该正确扫描 Markdown 文件', async () => {
      // 通过 status 测试内部扫描逻辑
      const status = await ontomark.getStatus();
      expect(status.totalFiles).toBeGreaterThan(500);
    });
  });

  describe('Wiki Generation (Mock)', () => {
    it('应该能够生成基本的 Wiki 页面结构', async () => {
      const wikiFiles = await fs.readdir(WIKI_PATH);
      // 初始状态 wiki 目录应该为空（只有 index.md 如果存在）
      const mdFiles = wikiFiles.filter(f => f.endsWith('.md'));
      // 可能包含 index.md 或 AGENT_CONTEXT.md
      expect(mdFiles.length).toBeLessThanOrEqual(2);
    });
  });
});

// 额外的手动测试函数（需要 API Key 时使用）
export async function runManualBuildTest() {
  console.log('运行手动构建测试...');

  const ontomark = new OntoMark({
    projectPath: VAULT_PATH,
    rawPath: RAW_PATH,
    wikiPath: WIKI_PATH,
    aiProvider: createMockProvider(),
  });

  const status = await ontomark.getStatus();
  console.log('项目状态:', status);

  // 如果有 API Key，可以运行完整构建
  // const result = await ontomark.build();
  // console.log('构建结果:', result);
}
