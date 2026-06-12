#!/usr/bin/env ts-node
/**
 * MultiHop-RAG 实际构建测试
 *
 * 运行方式：
 *   DEEPSEEK_API_KEY=xxx npx ts-node tests/run_multihop_build.ts
 *   或
 *   OPENAI_API_KEY=xxx npx ts-node tests/run_multihop_build.ts --provider openai
 */

import * as path from 'path';
import { OntoMark } from '../src/index';
import { OpenAIProvider } from '../src/llm/openai-provider';

const VAULT_PATH = path.join(__dirname, 'markdown/multi_hop_vault');
const RAW_PATH = path.join(VAULT_PATH, 'raw');
const WIKI_PATH = path.join(VAULT_PATH, 'wiki');

async function main() {
  const args = process.argv.slice(2);
  const providerName = args.includes('--provider')
    ? args[args.indexOf('--provider') + 1]
    : 'deepseek';

  const isOpenAI = providerName === 'openai';
  const apiKey = isOpenAI
    ? process.env.OPENAI_API_KEY
    : process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.error(`请设置 ${isOpenAI ? 'OPENAI_API_KEY' : 'DEEPSEEK_API_KEY'} 环境变量`);
    process.exit(1);
  }

  console.log('========================================');
  console.log('OntoMark V2 - MultiHop-RAG 构建测试');
  console.log('========================================');
  console.log(`Provider: ${providerName}`);
  console.log(`Raw 目录: ${RAW_PATH}`);
  console.log(`Wiki 目录: ${WIKI_PATH}`);
  console.log('');

  const aiProvider = new OpenAIProvider({
    apiKey,
    baseURL: isOpenAI ? undefined : 'https://api.deepseek.com/v1',
    model: isOpenAI ? 'gpt-4o-mini' : 'deepseek-chat',
  });

  const ontomark = new OntoMark({
    projectPath: VAULT_PATH,
    rawPath: RAW_PATH,
    wikiPath: WIKI_PATH,
    aiProvider,
  });

  // 1. 检查状态
  console.log('📊 检查项目状态...');
  const status = await ontomark.getStatus();
  console.log(`   Raw 文档: ${status.rawFiles}`);
  console.log(`   Wiki 页面: ${status.wikiFiles}`);
  console.log('');

  // 2. 运行构建（只处理前 10 个文档用于测试）
  console.log('🚀 开始构建（测试模式：仅处理前 10 个文档）...');
  console.log('   注意：这会调用 LLM API，可能需要几分钟');
  console.log('');

  const startTime = Date.now();

  try {
    // 先测试 extract
    console.log('📝 步骤 1: 执行 extract...');
    const extractResult = await ontomark.extract();
    console.log(`   提取成功: ${extractResult.extractSuccess}`);
    console.log(`   提取失败: ${extractResult.extractFailed}`);
    console.log(`   Wiki 页面: ${extractResult.wikiPages}`);
    console.log(`   需审核: ${extractResult.reviewPages}`);
    console.log('');

    // 然后测试 link
    console.log('🔗 步骤 2: 执行 link...');
    const linkResult = await ontomark.link();
    console.log(`   处理文件: ${linkResult.wikiPages}`);
    console.log(`   新增链接: ${linkResult.linksAdded}`);
    console.log('');

    // 最后测试完整 build
    console.log('🏗️ 步骤 3: 执行完整 build...');
    const buildResult = await ontomark.build();
    console.log(`   提取成功: ${buildResult.extractSuccess}`);
    console.log(`   Wiki 页面: ${buildResult.wikiPages}`);
    console.log(`   新增链接: ${buildResult.linksAdded}`);
    console.log(`   Topic 页面: ${buildResult.topics}`);
    console.log('');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('========================================');
    console.log(`✅ 构建完成！耗时 ${elapsed}s`);
    console.log('========================================');
    console.log('');
    console.log('📁 生成的 Wiki 结构:');

    // 显示 wiki 目录结构
    const { execSync } = require('child_process');
    try {
      const treeOutput = execSync(`find ${WIKI_PATH} -type f -name "*.md" | head -20`).toString();
      console.log(treeOutput);
    } catch {
      console.log('   (无法显示目录结构)');
    }

  } catch (error) {
    console.error('❌ 构建失败:', error);
    process.exit(1);
  }
}

main().catch(console.error);
