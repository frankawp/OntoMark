import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { RawStatusResult, ProcessedFile, ProcessedData } from './types';

/**
 * 查询 raw 文件状态
 *
 * @param projectPath 项目路径
 * @returns raw 文件状态信息
 */
export async function rawStatus(projectPath: string): Promise<RawStatusResult> {
  const rawDir = path.join(projectPath, 'raw');
  const processedPath = path.join(projectPath, '.ontomark', 'processed.json');

  // 加载已处理文件记录
  let processedData: ProcessedData = { files: {} };
  try {
    const content = await fs.readFile(processedPath, 'utf-8');
    processedData = JSON.parse(content);
  } catch {
    // 文件不存在，使用空记录
  }

  // 递归扫描 raw 目录
  const files: ProcessedFile[] = [];

  async function scanDir(dir: string, relativePrefix: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = `${relativePrefix}${entry.name}`;

        if (entry.isDirectory()) {
          await scanDir(fullPath, `${relativePath}/`);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const content = await fs.readFile(fullPath, 'utf-8');
          const hash = crypto.createHash('md5').update(content).digest('hex');

          const processed = processedData.files[relativePath];
          const modified = !processed || processed.hash !== hash;

          files.push({
            path: relativePath,
            lastProcessed: processed?.lastProcessed,
            hash,
            modified,
          });
        }
      }
    } catch {
      // 目录不存在或无法访问
    }
  }

  await scanDir(rawDir, 'raw/');

  return {
    files,
    total: files.length,
    pending: files.filter(f => f.modified).length,
  };
}
