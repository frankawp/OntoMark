#!/usr/bin/env node

import { Command } from 'commander';
import { OntoMark } from './index';
import { ConflictError } from './utils/errors';
import { DeepSeekProvider } from './llm/deepseek-provider';

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
        llmProvider: createLLMProvider(),
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
        llmProvider: createLLMProvider(),
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
        llmProvider: createLLMProvider(),
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
        llmProvider: createLLMProvider(),
      });

      await ontomark.buildIndex();
      const status = await ontomark.getStatus();

      console.log('\nVault 状态:');
      console.log(`- 文件数量: ${status.totalFiles}`);
      console.log(`- 已索引: ${status.indexedFiles}`);
      console.log(`- 待增强: ${status.pendingFiles}`);
    } catch (error) {
      console.error('错误:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// 创建 LLM provider
function createLLMProvider() {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.warn('警告: 未设置 DEEPSEEK_API_KEY 环境变量，将不会进行实体识别');
    console.warn('请设置: export DEEPSEEK_API_KEY=your-api-key');
    return {
      recognize: async () => ({ entities: [] }),
    };
  }

  return new DeepSeekProvider({
    apiKey,
    model: 'deepseek-chat',
  });
}

program.parse();