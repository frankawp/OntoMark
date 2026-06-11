#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs/promises';
import { Command } from 'commander';
import { OntoMark } from './index';
import { ConflictError } from './utils/errors';
import { DeepSeekProvider } from './llm/deepseek-provider';

const program = new Command();

program
  .name('ontomark')
  .description('Ontology-Aware Markdown Enhancer')
  .version('0.1.0');

// ============== V2 API 命令 ==============

program
  .command('extract <vault-path>')
  .description('从 raw 文档提取实体，生成 wiki 页面')
  .option('--raw-path <path>', '指定 raw 目录')
  .option('--force', '强制重新处理')
  .action(async (vaultPath: string, options: { rawPath?: string; force?: boolean }) => {
    try {
      const resolvedVaultPath = path.resolve(vaultPath);
      const ontomark = new OntoMark({
        rawPath: options.rawPath || path.join(resolvedVaultPath, 'raw'),
        wikiPath: path.join(resolvedVaultPath, 'wiki'),
        llmProvider: createLLMProvider(),
      });

      console.log('\n开始提取实体...');
      const result = await ontomark.extract({ force: options.force });

      console.log('\n提取完成');
      console.log(`- 处理文档: ${result.extractSuccess} 个成功, ${result.extractFailed} 个失败`);
      console.log(`- 生成 wiki 页面: ${result.wikiPages} 个`);
    } catch (error) {
      console.error('错误:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('link <vault-path>')
  .description('在 wiki 内部生成链接')
  .option('--wiki-path <path>', '指定 wiki 目录')
  .option('--force', '强制重新处理')
  .action(async (vaultPath: string, options: { wikiPath?: string; force?: boolean }) => {
    try {
      const resolvedVaultPath = path.resolve(vaultPath);
      const ontomark = new OntoMark({
        rawPath: path.join(resolvedVaultPath, 'raw'),
        wikiPath: options.wikiPath || path.join(resolvedVaultPath, 'wiki'),
        llmProvider: createLLMProvider(),
      });

      console.log('\n开始生成链接...');
      const result = await ontomark.link({ force: options.force });

      console.log('\n链接生成完成');
      console.log(`- 成功: ${result.linkSuccess} 个`);
      console.log(`- 失败: ${result.linkFailed} 个`);
    } catch (error) {
      console.error('错误:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('build <vault-path>')
  .description('完整构建流程: extract + link')
  .option('--raw-path <path>', '指定 raw 目录')
  .option('--wiki-path <path>', '指定 wiki 目录')
  .option('--force', '强制重新处理')
  .action(async (vaultPath: string, options: { rawPath?: string; wikiPath?: string; force?: boolean }) => {
    try {
      const resolvedVaultPath = path.resolve(vaultPath);
      const ontomark = new OntoMark({
        rawPath: options.rawPath || path.join(resolvedVaultPath, 'raw'),
        wikiPath: options.wikiPath || path.join(resolvedVaultPath, 'wiki'),
        llmProvider: createLLMProvider(),
      });

      console.log('\n开始完整构建...');
      const result = await ontomark.build({ force: options.force });

      console.log('\n构建完成');
      console.log(`- 提取文档: ${result.extractSuccess} 个成功, ${result.extractFailed} 个失败`);
      console.log(`- 生成 wiki 页面: ${result.wikiPages} 个`);
      console.log(`- 链接生成: ${result.linkSuccess} 个成功, ${result.linkFailed} 个失败`);
    } catch (error) {
      console.error('错误:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============== V1 API 命令 (向后兼容) ==============

program
  .command('index <vault-path>')
  .description('构建 Vault 实体索引 (legacy)')
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
  .description('增强单个 Markdown 文件 (legacy)')
  .option('--dry-run', '仅输出变更，不写入文件')
  .option('--force', '忽略缓存，强制重新处理')
  .option('--vault-path <path>', '指定 vault 路径')
  .action(async (filePath: string, options: { dryRun?: boolean; force?: boolean; vaultPath?: string }) => {
    try {
      // 自动推断 vault 路径：如果未指定，尝试从文件路径推断
      let vaultPath = options.vaultPath;
      const absoluteFilePath = path.resolve(filePath);

      if (!vaultPath) {
        // 检查文件路径是否在某个包含 ontology.yaml 的目录下
        // 向上查找，最多3级
        for (let i = 0; i < 3; i++) {
          const candidateVault = path.resolve(absoluteFilePath, '../'.repeat(i + 1));
          const ontologyPath = path.join(candidateVault, 'ontology.yaml');
          try {
            await fs.access(ontologyPath);
            vaultPath = candidateVault;
            break;
          } catch {
            continue;
          }
        }

        if (!vaultPath) {
          vaultPath = process.cwd();
        }
      }

      const ontomark = new OntoMark({
        vaultPath: path.resolve(vaultPath),
        llmProvider: createLLMProvider(),
      });

      await ontomark.buildIndex();
      const result = await ontomark.enhanceFile(absoluteFilePath);

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
  .description('批量增强所有需要处理的文件 (legacy)')
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
  .option('--raw-path <path>', '指定 raw 目录（V2 模式）')
  .option('--wiki-path <path>', '指定 wiki 目录（V2 模式）')
  .action(async (vaultPath: string, options: { rawPath?: string; wikiPath?: string }) => {
    try {
      let ontomark: OntoMark;

      // V2 模式：指定了 raw-path 或 wiki-path
      if (options.rawPath || options.wikiPath) {
        const resolvedVaultPath = vaultPath ? path.resolve(vaultPath) : process.cwd();
        ontomark = new OntoMark({
          rawPath: options.rawPath || path.join(resolvedVaultPath, 'raw'),
          wikiPath: options.wikiPath || path.join(resolvedVaultPath, 'wiki'),
          llmProvider: createLLMProvider(),
        });
      } else {
        // V1 向后兼容模式
        ontomark = new OntoMark({
          vaultPath: vaultPath || process.cwd(),
          llmProvider: createLLMProvider(),
        });
      }

      const status = await ontomark.getStatus();

      console.log('\nVault 状态:');
      console.log(`- 文件数量: ${status.totalFiles}`);
      console.log(`- 已索引: ${status.indexedFiles}`);
      console.log(`- 待处理: ${status.pendingFiles}`);

      // V2 模式额外信息
      if (status.rawFiles !== undefined) {
        console.log(`- Raw 文档: ${status.rawFiles} 个`);
        console.log(`- Wiki 页面: ${status.wikiFiles} 个`);
      }
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