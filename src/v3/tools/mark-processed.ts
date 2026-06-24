/**
 * 标记文件已处理 — 记录当前 HEAD hash
 * 不再计算 MD5，依赖 git commit hash 判断变更
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { ProcessedData } from './types';

/**
 * 标记当前 HEAD 为已处理状态
 */
export async function markProcessed(projectPath: string): Promise<void> {
  const ontomarkDir = path.join(projectPath, '.ontomark');
  const processedPath = path.join(ontomarkDir, 'processed.json');

  // 确保目录存在
  await fs.mkdir(ontomarkDir, { recursive: true });

  // 获取当前 HEAD hash
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: projectPath,
    encoding: 'utf-8',
    stdio: 'pipe',
  });
  if (result.status !== 0) {
    throw new Error('无法获取 git HEAD hash。请确保项目在 git 仓库中。');
  }
  const headHash = result.stdout.trim();

  // 读取现有数据
  let data: ProcessedData = {};
  try {
    const content = await fs.readFile(processedPath, 'utf-8');
    data = JSON.parse(content);
  } catch {
    // 文件不存在
  }

  // 更新记录
  data.lastProcessedHash = headHash;
  data.lastProcessedAt = new Date().toISOString();

  // 写入
  await fs.writeFile(processedPath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 兼容旧接口（不再需要文件参数）
 */
export async function markProcessedBatch(projectPath: string, _filePaths?: string[]): Promise<void> {
  return markProcessed(projectPath);
}
