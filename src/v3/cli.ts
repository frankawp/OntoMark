#!/usr/bin/env node

import { Command } from 'commander';
import { rawStatus } from './tools/raw-status';
import { wikiStatus } from './tools/wiki-status';
import { ontologyStatus } from './tools/ontology-status';
import { markProcessed } from './tools/mark-processed';
import { wikiWrite } from './tools/wiki-write';
import { indexBuild } from './tools/index-build';
import { indexQuery } from './tools/index-query';
import { lintAll } from './tools/lint-all';

const program = new Command();

program
  .name('ontomark')
  .description('OntoMark - Ontology-Driven Knowledge Base Builder')
  .version('3.0.0');

// 文件状态工具
program
  .command('raw-status <project-path>')
  .description('查询 raw 文件状态')
  .action(async (projectPath: string) => {
    const result = await rawStatus(projectPath);
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('wiki-status <project-path>')
  .description('查询 wiki 文件状态')
  .action(async (projectPath: string) => {
    const result = await wikiStatus(projectPath);
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('ontology-status <project-path>')
  .description('查询 ontology 状态')
  .action(async (projectPath: string) => {
    const result = await ontologyStatus(projectPath);
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('mark-processed <project-path> <file-path>')
  .description('标记文件已处理')
  .action(async (projectPath: string, filePath: string) => {
    await markProcessed(projectPath, filePath);
    console.log(`Marked ${filePath} as processed`);
  });

// Wiki 工具
program
  .command('wiki-write <project-path>')
  .description('写入 wiki 页面')
  .requiredOption('--canonical <name>', '规范名称')
  .requiredOption('--type <type>', '实体类型')
  .requiredOption('--content <content>', '内容')
  .requiredOption('--sources <json>', '来源 JSON')
  .option('--aliases <json>', '别名 JSON')
  .option('--info <json>', '信息 JSON')
  .option('--needs-review', '是否需审核')
  .requiredOption('--is-update <boolean>', '是否更新', (v) => v === 'true')
  .action(async (projectPath: string, options) => {
    const result = await wikiWrite({
      projectPath,
      canonical: options.canonical,
      type: options.type,
      content: options.content,
      sources: JSON.parse(options.sources),
      aliases: options.aliases ? JSON.parse(options.aliases) : undefined,
      info: options.info ? JSON.parse(options.info) : undefined,
      needsReview: options.needsReview,
      isUpdate: options.isUpdate,
    });
    console.log(JSON.stringify(result, null, 2));
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
