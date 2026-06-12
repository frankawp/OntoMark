#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import { Command } from 'commander';
import { OntoMark } from './index';
import { OpenAIProvider } from './llm/openai-provider';
import { AIProvider } from './llm/types';

const program = new Command();

program
  .name('ontomark')
  .description('Ontology-Driven AI Native Wiki Builder')
  .version('0.2.0');

program
  .command('init [path]')
  .description('初始化 OntoMark V2 项目结构')
  .option('--force', '强制覆盖已存在的 ontology.yaml')
  .action(async (projectPath: string | undefined, options: { force?: boolean }) => {
    try {
      const target = path.resolve(projectPath || process.cwd());
      await initProject(target, Boolean(options.force));
      console.log(`\n项目初始化完成: ${target}`);
    } catch (error) {
      console.error('错误:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('extract <project-path>')
  .description('从 raw 文档提取知识对象并生成 wiki 页面')
  .option('--raw-path <path>', '指定 raw 目录')
  .option('--wiki-path <path>', '指定 wiki 目录')
  .option('--provider <name>', 'LLM provider (deepseek | openai)', 'deepseek')
  .action(async (projectPath: string, options: { rawPath?: string; wikiPath?: string; provider?: string }) => {
    await runCommand(projectPath, options, 'extract');
  });

program
  .command('ingest <project-path>')
  .description('构建 wiki（build 的语义化别名）')
  .option('--raw-path <path>', '指定 raw 目录')
  .option('--wiki-path <path>', '指定 wiki 目录')
  .option('--provider <name>', 'LLM provider (deepseek | openai)', 'deepseek')
  .action(async (projectPath: string, options: { rawPath?: string; wikiPath?: string; provider?: string }) => {
    await runCommand(projectPath, options, 'build');
  });

program
  .command('link <project-path>')
  .description('在 wiki 内部生成链接')
  .option('--raw-path <path>', '指定 raw 目录')
  .option('--wiki-path <path>', '指定 wiki 目录')
  .option('--provider <name>', 'LLM provider (deepseek | openai)', 'deepseek')
  .action(async (projectPath: string, options: { rawPath?: string; wikiPath?: string; provider?: string }) => {
    await runCommand(projectPath, options, 'link');
  });

program
  .command('build <project-path>')
  .description('完整构建流程: extract + link + backlink + topic + context + index + log')
  .option('--raw-path <path>', '指定 raw 目录')
  .option('--wiki-path <path>', '指定 wiki 目录')
  .option('--provider <name>', 'LLM provider (deepseek | openai)', 'deepseek')
  .action(async (projectPath: string, options: { rawPath?: string; wikiPath?: string; provider?: string }) => {
    await runCommand(projectPath, options, 'build');
  });

program
  .command('status <project-path>')
  .description('查看项目状态和知识库统计')
  .option('--raw-path <path>', '指定 raw 目录')
  .option('--wiki-path <path>', '指定 wiki 目录')
  .action(async (projectPath: string, options: { rawPath?: string; wikiPath?: string }) => {
    try {
      const ontomark = createOntoMark(projectPath, options);
      const status = await ontomark.getStatus();
      const stats = await ontomark.stats();
      console.log('\n项目状态:');
      console.log(`- Raw 文档: ${status.rawFiles}`);
      console.log(`- Wiki 页面: ${stats.wikiPages}`);
      console.log(`- Schema hash: ${status.schemaHash}`);
      if (stats.lastBuild) {
        console.log(`- 最后构建: ${stats.lastBuild}`);
      }
      console.log('\n知识库统计:');
      console.log(`- 总链接数: ${stats.totalLinks}`);
      console.log(`- 平均链接/页: ${stats.avgLinksPerPage}`);
      console.log(`- 孤立页面: ${stats.orphans}`);
      console.log('\n实体类型分布:');
      for (const [type, count] of Object.entries(stats.entitiesByType).sort((a, b) => b[1] - a[1])) {
        console.log(`  - ${type}: ${count}`);
      }
    } catch (error) {
      console.error('错误:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('lint <project-path>')
  .description('健康检查 wiki（孤立页面、缺失链接、空页面等）')
  .option('--raw-path <path>', '指定 raw 目录')
  .option('--wiki-path <path>', '指定 wiki 目录')
  .action(async (projectPath: string, options: { rawPath?: string; wikiPath?: string }) => {
    try {
      const ontomark = createOntoMark(projectPath, options);
      const result = await ontomark.lint();
      console.log('\nWiki 健康检查结果:');
      console.log(`- 孤立页面: ${result.orphanPages.length}`);
      if (result.orphanPages.length > 0 && result.orphanPages.length <= 10) {
        result.orphanPages.forEach(p => console.log(`  - ${p}`));
      }
      console.log(`- 缺失链接: ${result.missingLinks.reduce((sum, m) => sum + m.missing.length, 0)}`);
      console.log(`- 空页面: ${result.emptyPages.length}`);
      console.log(`- 低置信度: ${result.lowConfidence.length}`);
      console.log(`- 需审核: ${result.needsReview.length}`);
      console.log(`\n总计问题: ${result.totalIssues}`);
    } catch (error) {
      console.error('错误:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('context <entity-name> <project-path>')
  .description('获取实体上下文（为 Agent 提供查询）')
  .option('--raw-path <path>', '指定 raw 目录')
  .option('--wiki-path <path>', '指定 wiki 目录')
  .action(async (entityName: string, projectPath: string, options: { rawPath?: string; wikiPath?: string }) => {
    try {
      const ontomark = createOntoMark(projectPath, options);
      const result = await ontomark.context(entityName);
      if (!result) {
        console.log(`\n未找到实体: ${entityName}`);
        process.exit(1);
      }
      console.log(`\n# ${result.entity}`);
      console.log(`类型: ${result.entityType}`);
      if (result.aliases.length > 0) {
        console.log(`别名: ${result.aliases.join(', ')}`);
      }
      console.log(`\n## 摘要\n${result.summary}`);
      if (result.relatedEntities.length > 0) {
        console.log(`\n## 相关实体\n${result.relatedEntities.map(e => `- [[${e}]]`).join('\n')}`);
      }
      if (result.sources.length > 0) {
        console.log(`\n## 来源\n${result.sources.map(s => `- ${s}`).join('\n')}`);
      }
    } catch (error) {
      console.error('错误:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

async function runCommand(
  projectPath: string,
  options: { rawPath?: string; wikiPath?: string; provider?: string },
  action: 'extract' | 'link' | 'build'
): Promise<void> {
  try {
    const ontomark = createOntoMark(projectPath, options);
    const result = await ontomark[action]();
    console.log(`\n${action} 完成`);
    console.log(`- 提取成功: ${result.extractSuccess}`);
    console.log(`- 提取失败: ${result.extractFailed}`);
    console.log(`- Wiki 页面: ${result.wikiPages}`);
    console.log(`- Review 页面: ${result.reviewPages}`);
    console.log(`- 新增链接: ${result.linksAdded}`);
    console.log(`- Topic 页面: ${result.topics}`);
  } catch (error) {
    console.error('错误:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function createOntoMark(
  projectPath: string,
  options: { rawPath?: string; wikiPath?: string; provider?: string }
): OntoMark {
  const project = path.resolve(projectPath);
  return new OntoMark({
    projectPath: project,
    rawPath: path.resolve(options.rawPath || path.join(project, 'raw')),
    wikiPath: path.resolve(options.wikiPath || path.join(project, 'wiki')),
    aiProvider: createProvider(options.provider || 'deepseek'),
  });
}

function createProvider(name: string): AIProvider {
  const isOpenAI = name === 'openai';
  const apiKey = isOpenAI ? process.env.OPENAI_API_KEY : process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.warn(`警告: 未设置 ${isOpenAI ? 'OPENAI_API_KEY' : 'DEEPSEEK_API_KEY'}，实体提取将返回空结果`);
    return {
      extract: async () => ({ entities: [] }),
      classify: async (_text, types) => ({ type: types[0] || '', confidence: 0 }),
      generate: async () => '',
      isAvailable: async () => false,
    };
  }

  return new OpenAIProvider({
    apiKey,
    baseURL: isOpenAI ? undefined : 'https://api.deepseek.com/v1',
    model: isOpenAI ? 'gpt-4o-mini' : 'deepseek-chat',
  });
}

async function initProject(projectPath: string, force: boolean): Promise<void> {
  const ontologyPath = path.join(projectPath, 'ontology.yaml');
  const exists = await fs.access(ontologyPath).then(() => true).catch(() => false);
  if (exists && !force) {
    throw new Error(`目录已存在: ${projectPath}。使用 --force 强制覆盖。`);
  }

  await fs.mkdir(path.join(projectPath, 'raw'), { recursive: true });
  await fs.mkdir(path.join(projectPath, 'wiki'), { recursive: true });
  await fs.mkdir(path.join(projectPath, '.ontomark', 'cache'), { recursive: true });
  await fs.writeFile(ontologyPath, defaultOntology(), 'utf-8');
  await fs.writeFile(path.join(projectPath, 'AGENTS.md'), agentsTemplate(), 'utf-8');
  await fs.writeFile(path.join(projectPath, 'CLAUDE.md'), agentsTemplate(), 'utf-8');
}

function defaultOntology(): string {
  return `version: "1.0"
entity_types:
  Topic:
    description: 主题页/知识地图
  Concept:
    description: 概念
  System:
    description: 系统
  Component:
    description: 组件
  ADR:
    description: 架构决策
  Requirement:
    description: 需求
  Incident:
    description: 故障事件
  Team:
    description: 团队
  Person:
    description: 人员
  Tool:
    description: 工具
relations: {}
`;
}

function agentsTemplate(): string {
  return `# OntoMark Agent Instructions

- Treat \`raw/\` as immutable source material.
- Treat \`wiki/\` as the compiled knowledge layer.
- Run \`ontomark build <project-path>\` after adding sources.
- Review pages with \`needs_review: true\` before treating them as canonical.
`;
}

program.parse();
