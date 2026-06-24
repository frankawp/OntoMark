import * as fs from 'fs/promises';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { PendingFilesResult, ProcessedData } from './types';
import { readConfig } from './read-config';

/**
 * 使用 git commit hash 检测输入目录中新增或变更的文件
 *
 * @param projectPath 项目路径
 * @returns 待处理文件清单
 */

function gitCommand(args: string[], projectPath: string): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync('git', args, { cwd: projectPath, encoding: 'utf-8', stdio: 'pipe' });
  return { stdout: result.stdout.trim(), stderr: result.stderr.trim(), status: result.status };
}

export async function pendingFiles(projectPath: string): Promise<PendingFilesResult> {
  // 读取配置
  const config = await readConfig(projectPath);
  const inputDirs = config.inputDirs;
  const ontologyFile = config.ontologyFile;

  // 1. 读取处理状态
  const processedPath = path.join(projectPath, '.ontomark', 'processed.json');
  let processedData: ProcessedData = {};
  try {
    const content = await fs.readFile(processedPath, 'utf-8');
    processedData = JSON.parse(content);
  } catch {
    // 文件不存在，首次运行
  }

  // 2. 验证 git 仓库
  const { status: gitDirStatus } = gitCommand(['rev-parse', '--git-dir'], projectPath);
  if (gitDirStatus !== 0) {
    throw new Error('当前目录不在 git 仓库中。OntoMark 依赖 git 检测文件变更。');
  }

  const lastHash = processedData.lastProcessedHash;

  // 3. 首次运行：没有 lastProcessedHash
  if (!lastHash) {
    // 扫描所有输入目录，递归查找所有 .md 文件
    const files: string[] = [];
    for (const inputDir of inputDirs) {
      const fullDir = path.join(projectPath, inputDir);
      const prefix = inputDir.replace(/\/$/, ''); // 去尾斜杠
      await scanMdFiles(fullDir, prefix, files);
    }

    // 检查 ontologyFile 是否存在
    const ontologyChanged = await ontologyFileExists(projectPath, ontologyFile);

    // 获取 HEAD hash
    const { stdout: headHash } = gitCommand(['rev-parse', 'HEAD'], projectPath);

    return {
      files,
      total: files.length,
      ontologyChanged,
      lastHash: headHash,
    };
  }

  // 4. 非首次运行：用 git log 检测变更
  // 验证 hash 在分支历史中
  const { status: verifyStatus } = gitCommand(['rev-parse', '--verify', lastHash], projectPath);
  if (verifyStatus !== 0) {
    throw new Error(
      `错误：lastProcessedHash (${lastHash}) 在当前分支历史中不存在。\n` +
      '可能的原因是 rebase 或 reset 导致提交历史重写。\n' +
      '请确认上次 ingest 的位置后，手动更新 .ontomark/processed.json 中的\n' +
      `lastProcessedHash 为正确的 commit hash，然后重试。`
    );
  }

  // 获取 user email
  const { stdout: userEmail, status: emailStatus } = gitCommand(['config', 'user.email'], projectPath);
  if (emailStatus !== 0 || !userEmail) {
    throw new Error('无法获取 git user.email。请先配置 git: git config user.email "your@email.com"');
  }

  // 构建 git log 路径过滤条件：所有输入目录下的 .md 文件 + ontology 文件
  const pathspecs: string[] = [];
  for (const inputDir of inputDirs) {
    pathspecs.push(`${inputDir.replace(/\/$/, '')}/*.md`);
  }
  pathspecs.push(ontologyFile);

  // 执行 git log 获取变更文件
  const { stdout: changedOutput, status: logStatus } = gitCommand(
    ['log', `${lastHash}..HEAD`, `--author=${userEmail}`, '--name-only', '--pretty=format:', '--diff-filter=ACMR', '--', ...pathspecs],
    projectPath
  );
  if (logStatus !== 0) {
    throw new Error(
      `错误：无法从 ${lastHash} 获取变更记录。\n` +
      `可能的原因是 HEAD 已回退到 ${lastHash} 之前的版本。\n` +
      '请确认后手动更新 .ontomark/processed.json 中的 lastProcessedHash。'
    );
  }

  // 解析输出
  const changedLines = changedOutput ? changedOutput.split('\n') : [];
  const changedFiles = [...new Set(changedLines)]; // 去重

  const rawFiles: string[] = [];
  let ontologyChanged = false;

  for (const file of changedFiles) {
    const trimmed = file.trim();
    if (!trimmed) continue;

    if (trimmed === ontologyFile) {
      ontologyChanged = true;
    } else if (trimmed.endsWith('.md')) {
      // 检查文件是否在输入目录中
      const inInputDir = inputDirs.some(dir => trimmed.startsWith(dir.replace(/\/$/, '') + '/'));
      if (inInputDir) {
        rawFiles.push(trimmed);
      }
    }
  }

  // 获取 HEAD hash
  const { stdout: headHash } = gitCommand(['rev-parse', 'HEAD'], projectPath);

  return {
    files: rawFiles,
    total: rawFiles.length,
    ontologyChanged,
    lastHash: headHash,
  };
}

/**
 * 递归扫描目录下所有 .md 文件
 */
async function scanMdFiles(dir: string, relativePrefix: string, result: string[]): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = `${relativePrefix}/${entry.name}`;

      if (entry.isDirectory()) {
        await scanMdFiles(fullPath, relativePath, result);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        result.push(relativePath);
      }
    }
  } catch {
    // 目录不存在或无法访问
  }
}

/**
 * 检查 ontology 文件是否存在于项目根目录
 */
async function ontologyFileExists(projectPath: string, ontologyFile: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectPath, ontologyFile));
    return true;
  } catch {
    return false;
  }
}
