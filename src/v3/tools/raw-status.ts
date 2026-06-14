import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { RawStatusResult, ProcessedFile, ProcessedData } from './types';
import { getOntologyPath } from './ontology-path';

export interface RawStatusOptions {
  /** 过滤条件: true=只返回已修改, false=只返回未修改, 'all'=返回全部 */
  modified?: boolean | 'all';
  /** 返回文件数量限制，默认 10，0 表示全部 */
  limit?: number;
}

/**
 * 查询 raw 文件状态
 *
 * @param projectPath 项目路径
 * @param options 选项
 * @returns raw 文件状态信息
 */
export async function rawStatus(
  projectPath: string,
  options: RawStatusOptions = {}
): Promise<RawStatusResult> {
  const { modified = true, limit = 10 } = options;
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

  // 检查 ontology.yaml 是否变化
  const ontologyResult = await getOntologyPath(projectPath);
  let ontologyChanged = false;
  let ontologyHash = '';

  if (ontologyResult.exists) {
    const ontologyContent = await fs.readFile(ontologyResult.path, 'utf-8');
    ontologyHash = crypto.createHash('md5').update(ontologyContent).digest('hex');
    const savedOntologyHash = processedData.ontologyHash;
    ontologyChanged = !savedOntologyHash || savedOntologyHash !== ontologyHash;
  } else {
    ontologyChanged = true;
  }

  // 递归扫描 raw 目录
  const allFiles: ProcessedFile[] = [];

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
          // 如果 ontology 变化，所有文件都视为需要重新处理
          const fileModified = ontologyChanged || !processed || processed.hash !== hash;

          allFiles.push({
            path: relativePath,
            lastProcessed: processed?.lastProcessed,
            hash,
            modified: fileModified,
          });
        }
      }
    } catch {
      // 目录不存在或无法访问
    }
  }

  await scanDir(rawDir, 'raw/');

  // 根据条件过滤
  let filteredFiles = allFiles;
  if (modified === true) {
    filteredFiles = allFiles.filter(f => f.modified);
  } else if (modified === false) {
    filteredFiles = allFiles.filter(f => !f.modified);
  }
  // modified === 'all' 时不做过滤

  // 应用 limit
  const limitedFiles = limit > 0 ? filteredFiles.slice(0, limit) : filteredFiles;

  return {
    files: limitedFiles,
    total: allFiles.length,
    pending: allFiles.filter(f => f.modified).length,
    ontologyChanged,
    ontologyHash,
  };
}