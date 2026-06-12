#!/usr/bin/env ts-node
/**
 * 完整构建测试 - 处理全部文档
 */

import * as path from 'path';
import { OntoMark, OpenAIProvider } from '../src/index';

const VAULT_PATH = path.join(__dirname, 'markdown/multi_hop_vault');

async function main() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('请设置 DEEPSEEK_API_KEY 环境变量');
    process.exit(1);
  }

  console.log('========================================');
  console.log('OntoMark V2 - 完整构建测试');
  console.log('========================================');
  console.log(`项目路径: ${VAULT_PATH}`);
  console.log('');

  const aiProvider = new OpenAIProvider({
    apiKey,
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  });

  const ontomark = new OntoMark({
    projectPath: VAULT_PATH,
    aiProvider,
  });

  // 查看状态
  const status = await ontomark.getStatus();
  console.log('项目状态:');
  console.log(`  Raw 文档: ${status.rawFiles}`);
  console.log(`  Wiki 页面: ${status.wikiFiles}`);
  console.log('');

  const startTime = Date.now();

  // 运行完整构建
  console.log('开始完整构建...');
  const result = await ontomark.build();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('========================================');
  console.log(`✅ 构建完成！耗时 ${elapsed}s`);
  console.log('========================================');
  console.log('');
  console.log('构建结果:');
  console.log(`  Wiki 页面: ${result.pages.length}`);
  console.log(`  新增链接: ${result.linksAdded || 0}`);
}

main().catch(console.error);