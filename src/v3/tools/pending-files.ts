import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { PendingFilesResult, ProcessedData } from './types';

/**
 * 使用 git commit hash 检测 raw 目录中新增或变更的文件
 *
 * @param projectPath 项目路径
 * @returns 待处理文件清单
 */
export async function pendingFiles(projectPath: string): Promise<PendingFilesResult> {
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
  let gitDir: string;
  try {
    gitDir = execSync('git rev-parse --git-dir', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 10000,
    }).trim();
  } catch {
    throw new Error('当前目录不在 git 仓库中。OntoMark 依赖 git 检测文件变更。');
  }

  const lastHash = processedData.lastProcessedHash;

  // 3. 首次运行：没有 lastProcessedHash
  if (!lastHash) {
    // 扫描 raw 目录，递归查找所有 .md 文件
    const files: string[] = [];
    const rawDir = path.join(projectPath, 'raw');
    await scanMdFiles(rawDir, 'raw', files);

    // 检查 ontology.yaml 是否存在
    const ontologyChanged = await ontologyYamlExists(projectPath);

    // 获取 HEAD hash
    const headHash = execSync('git rev-parse HEAD', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 10000,
    }).trim();

    return {
      files,
      total: files.length,
      ontologyChanged,
      lastHash: headHash,
    };
  }

  // 4. 非首次运行：用 git log 检测变更
  // 验证 hash 在分支历史中
  try {
    execSync(`git rev-parse --verify "${lastHash}"`, {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 10000,
      stdio: 'pipe',
    });
  } catch {
    throw new Error(
      `错误：lastProcessedHash (${lastHash}) 在当前分支历史中不存在。\n` +
      '可能的原因是 rebase 或 reset 导致提交历史重写。\n' +
      '请确认上次 ingest 的位置后，手动更新 .ontomark/processed.json 中的\n' +
      `lastProcessedHash 为正确的 commit hash，然后重试。`
    );
  }

  // 获取 user email
  let userEmail: string;
  try {
    userEmail = execSync('git config user.email', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 10000,
    }).trim();
  } catch {
    throw new Error('无法获取 git user.email。请先配置 git: git config user.email "your@email.com"');
  }

  if (!userEmail) {
    throw new Error('无法获取 git user.email。请先配置 git: git config user.email "your@email.com"');
  }

  // 执行 git log 获取变更文件
  let changedOutput: string;
  try {
    changedOutput = execSync(
      `git log ${lastHash}..HEAD --author="${userEmail}" --name-only --pretty=format: --diff-filter=ACMR -- 'raw/*.md' 'ontology.yaml'`,
      {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 30000,
      }
    ).trim();
  } catch {
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

    if (trimmed === 'ontology.yaml') {
      ontologyChanged = true;
    } else if (trimmed.startsWith('raw/') && trimmed.endsWith('.md')) {
      rawFiles.push(trimmed);
    }
  }

  // 去重（虽然在 Set 阶段已经做了，但确保结果 clean）
  const uniqueFiles = [...new Set(rawFiles)];

  // 获取 HEAD hash
  const headHash = execSync('git rev-parse HEAD', {
    cwd: projectPath,
    encoding: 'utf-8',
    timeout: 10000,
  }).trim();

  return {
    files: uniqueFiles,
    total: uniqueFiles.length,
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
 * 检查 ontology.yaml 是否存在于项目根目录
 */
async function ontologyYamlExists(projectPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectPath, 'ontology.yaml'));
    return true;
  } catch {
    return false;
  }
}
