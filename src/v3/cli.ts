#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import { rawStatus } from './tools/raw-status';
import { wikiStatus } from './tools/wiki-status';
import { ontologyStatus } from './tools/ontology-status';
import { markProcessed, markProcessedBatch } from './tools/mark-processed';
import { wikiWrite } from './tools/wiki-write';
import { indexBuild } from './tools/index-build';
import { indexQuery } from './tools/index-query';
import { lintAll } from './tools/lint-all';
import { skillInstall, skillUninstall } from './tools/skill-install';
import { projectInit } from './tools/project-init';
import { WikiWriteEntity } from './tools/types';

/**
 * 安全解析 JSON，失败时返回友好错误
 */
function safeJsonParse<T>(jsonStr: string, label: string): T {
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    console.error(`错误：${label} 参数不是有效的 JSON 格式`);
    console.error(`用法示例：${label} 应为 JSON 字符串`);
    process.exit(1);
  }
}

const program = new Command();

program
  .name('ontomark')
  .description('OntoMark - Ontology-Driven Knowledge Base Builder')
  .version('3.0.0');

// 项目初始化
program
  .command('init [project-path]')
  .description('初始化项目结构（创建 raw/、wiki/、.ontomark/ 目录）\n            ontology.yaml 由 Ingest 首次执行时自动生成')
  .action(async (projectPath?: string) => {
    const targetPath = projectPath || '.';
    const result = await projectInit(targetPath);
    if (result.success) {
      console.log('✅ 项目初始化完成');
      console.log('创建了以下内容：');
      for (const item of result.created) {
        console.log(`   📁 ${item}`);
      }
      console.log('');
      console.log('下一步：');
      console.log('  1. 将文档放入 raw/ 目录');
      console.log('  2. 运行 /ontomark ingest 提取实体');
      console.log('     (Ingest 首次执行时会根据文档内容自动推荐 ontology.yaml)');
    } else {
      console.error('❌ 初始化失败：');
      for (const err of result.errors) {
        console.error(`   ${err}`);
      }
      process.exit(1);
    }
  });

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

// 文件状态工具
program
  .command('raw-status <project-path>')
  .description('查询 raw 文件状态')
  .option('--modified <value>', '过滤条件: true=待处理, false=已处理, all=全部 (默认 true)', (v) => {
    if (v === 'true') return true;
    if (v === 'false') return false;
    return 'all';
  })
  .option('--limit <number>', '返回文件数量限制 (默认 10, 0=全部)', parseInt)
  .action(async (projectPath: string, options) => {
    const result = await rawStatus(projectPath, {
      modified: options.modified ?? true,
      limit: options.limit ?? 10,
    });
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
  .command('mark-processed <project-path>')
  .description('标记文件已处理')
  .option('--files <json>', '文件路径数组 JSON', (v) => safeJsonParse<string[]>(v, '--files'))
  .argument('[file-path]', '单个文件路径（与 --files 二选一）')
  .action(async (projectPath: string, filePath: string | undefined, options) => {
    if (options.files) {
      // 批量标记（原子写入，避免并发冲突）
      const files = options.files as string[];
      await markProcessedBatch(projectPath, files);
      console.log(`Marked ${files.length} files as processed`);
    } else if (filePath) {
      // 单个标记
      await markProcessed(projectPath, filePath);
      console.log(`Marked ${filePath} as processed`);
    } else {
      console.error('错误：请提供文件路径或使用 --files 参数');
      process.exit(1);
    }
  });

// Wiki 工具
program
  .command('wiki-write <project-path>')
  .description('写入 wiki 页面（覆盖写入）')
  .option('--entities <json>', '实体列表 JSON')
  .option('--canonical <name>', '规范名称（单个实体时使用）')
  .option('--type <type>', '实体类型（单个实体时使用）')
  .option('--content <content>', '内容（单个实体时使用）')
  .option('--sources <json>', '来源（字符串数组或对象数组）')
  .option('--aliases <json>', '别名 JSON')
  .option('--needs-review', '是否需审核')
  .action(async (projectPath: string, options) => {
    let entities: WikiWriteEntity[] = [];

    if (options.entities) {
      // 从命令行参数读取
      entities = safeJsonParse<WikiWriteEntity[]>(options.entities, '--entities');
    } else if (options.canonical && options.type && options.content && options.sources) {
      // 单个实体模式
      entities = [{
        canonical: options.canonical,
        type: options.type,
        content: options.content,
        sources: safeJsonParse<Array<{ file: string; lines?: number[] }>>(options.sources, '--sources'),
        aliases: options.aliases ? safeJsonParse<string[]>(options.aliases, '--aliases') : undefined,
        needsReview: options.needsReview,
      }];
    } else {
      console.error('错误：请提供 --entities 或完整的单个实体参数');
      console.error('用法示例：');
      console.error('  批量：ontomark wiki-write . --entities \'[{"canonical":"X","type":"Person",...}]\'');
      console.error('  单个：ontomark wiki-write . --canonical "X" --type Person --content "..." --sources \'["raw/a.md"]\'');
      process.exit(1);
    }

    const result = await wikiWrite({ projectPath, entities });
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
