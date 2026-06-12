#!/usr/bin/env ts-node
/**
 * 小规模构建测试 - 只处理前 5 个文档
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { OntoMark, OpenAIProvider } from '../src/index';

const VAULT_PATH = path.join(__dirname, 'markdown/multi_hop_vault');
const RAW_PATH = path.join(VAULT_PATH, 'raw');
const WIKI_PATH = path.join(VAULT_PATH, 'wiki');

async function main() {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('请设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY');
    process.exit(1);
  }

  const isDeepSeek = !!process.env.DEEPSEEK_API_KEY;

  console.log('========================================');
  console.log('OntoMark V2 - 小规模构建测试 (5 个文档)');
  console.log('========================================');
  console.log(`Provider: ${isDeepSeek ? 'DeepSeek' : 'OpenAI'}`);
  console.log('');

  // 只获取前 5 个文档
  const rawFiles = await getFirstNFiles(RAW_PATH, 5);
  console.log(`处理 ${rawFiles.length} 个文档:`);
  for (const f of rawFiles) {
    console.log(`  - ${path.basename(path.dirname(f))}/${path.basename(f).slice(0, 40)}...`);
  }
  console.log('');

  const aiProvider = new OpenAIProvider({
    apiKey,
    baseURL: isDeepSeek ? 'https://api.deepseek.com/v1' : undefined,
    model: isDeepSeek ? 'deepseek-chat' : 'gpt-4o-mini',
  });

  const startTime = Date.now();

  // 逐个处理文档，便于调试
  const { EntityExtractor } = await import('../src/discovery/extractor');
  const { EntityResolver } = await import('../src/discovery/resolver');
  const { WikiPageBuilder } = await import('../src/builder/page-builder');
  const { SchemaLoader } = await import('../src/schema/loader');

  // 加载 schema
  const schemaLoader = new SchemaLoader();
  const { schema } = await schemaLoader.loadWithFallback(VAULT_PATH);

  const extractor = new EntityExtractor(schema, aiProvider);
  const resolver = new EntityResolver();
  const pageBuilder = new WikiPageBuilder(schema);

  const allMentions: any[] = [];
  let success = 0;
  let failed = 0;

  for (const file of rawFiles) {
    try {
      process.stdout.write(`处理: ${path.basename(file).slice(0, 30)}... `);
      const result = await extractor.extractFromFile(file);
      allMentions.push(...result.entities);
      success++;
      console.log(`✓ (${result.entities.length} 个实体)`);
    } catch (error) {
      failed++;
      console.log(`✗ (${error})`);
    }
  }

  console.log('');
  console.log(`提取完成: ${success} 成功, ${failed} 失败`);
  console.log(`共提取 ${allMentions.length} 个实体提及`);

  // 实体消歧
  console.log('');
  console.log('进行实体消歧...');
  const resolution = resolver.resolve(allMentions);
  console.log(`  已消歧: ${resolution.resolved.length}`);
  console.log(`  需审核: ${resolution.needsReview.length}`);

  // 生成 Wiki 页面
  console.log('');
  console.log('生成 Wiki 页面...');
  const entities = [...resolution.resolved, ...resolution.needsReview];

  for (const entity of entities.slice(0, 10)) {
    const draft = pageBuilder.build(entity);
    const filePath = path.join(WIKI_PATH, draft.filePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, draft.content, 'utf-8');
    console.log(`  创建: ${draft.filePath}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log('========================================');
  console.log(`✅ 构建完成！耗时 ${elapsed}s`);
  console.log('========================================');
}

async function getFirstNFiles(dir: string, n: number): Promise<string[]> {
  const files: string[] = [];

  async function scan(d: string) {
    if (files.length >= n) return;

    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= n) break;

      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  await scan(dir);
  return files.slice(0, n);
}

main().catch(console.error);
