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

  // 扫描 raw 目录
  const files: ProcessedFile[] = [];
  try {
    const entries = await fs.readdir(rawDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = path.join(rawDir, entry.name);
        const relativePath = `raw/${entry.name}`;
        const content = await fs.readFile(filePath, 'utf-8');
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
    // raw 目录不存在
  }

  return {
    files,
    total: files.length,
    pending: files.filter(f => f.modified).length,
  };
}
