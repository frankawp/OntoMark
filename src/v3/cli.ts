#!/usr/bin/env node

import { Command } from 'commander';
import { pendingFiles } from './tools/pending-files';
import { wikiStatus } from './tools/wiki-status';
import { markProcessed, markProcessedBatch } from './tools/mark-processed';
import { indexBuild } from './tools/index-build';
import { indexQuery } from './tools/index-query';
import { lintAll } from './tools/lint-all';
import { skillInstall, skillUninstall } from './tools/skill-install';

const program = new Command();

program
  .name('ontomark')
  .description('OntoMark - Ontology-Driven Knowledge Base Builder')
  .version('3.0.0');

// Skill 安装命令
program
  .command('skill-install')
  .description('安装 Skill 到 Claude Code')
  .action(async () => {
    await skillInstall();
  });

program
  .command('skill-uninstall')
  .description('卸载 Claude Code 中的 Skill')
  .action(async () => {
    await skillUninstall();
  });

// 待处理文件检测
program
  .command('pending-files <project-path>')
  .description('检测待处理的 raw 文件（基于 git commit hash）')
  .action(async (projectPath: string) => {
    try {
      const result = await pendingFiles(projectPath);
      console.log(JSON.stringify(result, null, 2));
    } catch (err: any) {
      console.error(`错误: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('wiki-status <project-path>')
  .description('查询 wiki 文件状态')
  .action(async (projectPath: string) => {
    const result = await wikiStatus(projectPath);
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('mark-processed <project-path>')
  .description('标记当前 HEAD 为已处理状态')
  .action(async (projectPath: string) => {
    try {
      await markProcessed(projectPath);
      console.log('✅ 已标记为已处理');
    } catch (err: any) {
      console.error(`错误: ${err.message}`);
      process.exit(1);
    }
  });

// 索引工具
program
  .command('index-build <project-path>')
  .description('构建实体索引')
  .action(async (projectPath: string) => {
    const result = await indexBuild(projectPath);
    console.log(`Indexed ${Object.keys(result.entities).length} entities`);
  });

program
  .command('index-query <project-path> <name>')
  .description('查询实体索引')
  .option('--fuzzy', '模糊匹配')
  .action(async (projectPath: string, name: string, options) => {
    const result = await indexQuery(projectPath, name, options.fuzzy);
    console.log(JSON.stringify(result, null, 2));
  });

// Lint 工具
program
  .command('lint-all <project-path>')
  .description('综合检查')
  .action(async (projectPath: string) => {
    const result = await lintAll(projectPath);
    console.log(JSON.stringify(result, null, 2));
  });

program.parse();
