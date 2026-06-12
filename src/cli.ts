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

// ============== 初始化命令 ==============

program
  .command('init [path]')
  .description('初始化 OntoMark 项目结构')
  .option('--force', '强制覆盖已存在的目录')
  .action(async (projectPath: string | undefined, options: { force?: boolean }) => {
    try {
      const targetPath = projectPath ? path.resolve(projectPath) : process.cwd();
      await initProject(targetPath, options.force || false);
      console.log(`\n✓ 项目初始化完成: ${targetPath}`);
    } catch (error) {
      console.error('错误:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

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

// ============== init 命令辅助函数 ==============

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getDefaultOntology(): string {
  return `# OntoMark 实体类型定义
# 定义项目中的实体类型和属性

entities:
  - name: Person
    description: 人物实体
    properties:
      - name
      - title
      - organization

  - name: Organization
    description: 组织机构实体
    properties:
      - name
      - type
      - location

  - name: Concept
    description: 概念实体
    properties:
      - name
      - definition
      - category

  - name: Project
    description: 项目实体
    properties:
      - name
      - status
      - startDate
      - endDate

  - name: Technology
    description: 技术实体
    properties:
      - name
      - category
      - version
`;
}

function getClaudeTemplate(): string {
  return `# Claude Code 指令

本项目使用 OntoMark 进行知识图谱增强。

## 项目结构

- \`raw/\` - 原始文档目录
- \`wiki/\` - Wiki 页面目录（自动生成）
- \`.ontomark/cache/\` - 缓存目录
- \`ontology.yaml\` - 实体类型定义

## 工作流程

1. 将原始文档放入 \`raw/\` 目录
2. 运行 \`ontomark extract\` 提取实体
3. 运行 \`ontomark link\` 生成链接
4. 或直接运行 \`ontomark build\` 完整构建

## 实体类型

参见 \`ontology.yaml\` 文件定义。

## 规则

- 不要修改 \`wiki/\` 目录中的文件，它们由系统自动生成
- 在 \`raw/\` 目录中编写原始文档
- 使用 YAML frontmatter 定义文档元数据
`;
}

function getAgentsTemplate(): string {
  return `# Agent 指令

本项目使用 OntoMark 进行知识图谱管理。

## 核心职责

1. **文档处理**: 将原始文档转换为结构化 Wiki 页面
2. **实体提取**: 从文档中识别实体并建立关系
3. **链接生成**: 在 Wiki 页面间建立双向链接

## 工作原则

- 保持 ontology.yaml 的实体定义一致性
- 确保链接准确，避免歧义
- 维护知识的完整性和准确性

## 执行流程

\`\`\`
ontomark init      # 初始化项目
ontomark extract   # 提取实体
ontomark link      # 生成链接
ontomark build     # 完整构建
ontomark status    # 查看状态
\`\`\`
`;
}

async function initProject(targetPath: string, force: boolean): Promise<void> {
  // 检查是否已存在 ontology.yaml（表示已初始化）
  const ontologyPath = path.join(targetPath, 'ontology.yaml');
  const alreadyInitialized = await fileExists(ontologyPath);

  if (alreadyInitialized && !force) {
    throw new Error(`目录已存在: ${targetPath}。使用 --force 强制覆盖。`);
  }

  // 创建目录结构
  const dirs = [
    path.join(targetPath, 'raw'),
    path.join(targetPath, 'wiki'),
    path.join(targetPath, '.ontomark'),
    path.join(targetPath, '.ontomark', 'cache'),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  // 创建配置文件
  const files = [
    { path: path.join(targetPath, 'ontology.yaml'), content: getDefaultOntology() },
    { path: path.join(targetPath, 'CLAUDE.md'), content: getClaudeTemplate() },
    { path: path.join(targetPath, 'AGENTS.md'), content: getAgentsTemplate() },
  ];

  for (const file of files) {
    await fs.writeFile(file.path, file.content, 'utf-8');
  }

  console.log('创建目录:');
  console.log(`  - raw/          (原始文档)`);
  console.log(`  - wiki/         (Wiki 页面)`);
  console.log(`  - .ontomark/    (缓存目录)`);
  console.log('创建文件:');
  console.log(`  - ontology.yaml (实体类型定义)`);
  console.log(`  - CLAUDE.md     (Claude Code 指令)`);
  console.log(`  - AGENTS.md     (Agent 指令)`);
}

program.parse();