/**
 * 标记文件已处理
 * 更新 .ontomark/processed.json
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { ProcessedData } from './types';
import { getOntologyPath } from './ontology-path';

/**
 * 标记单个文件已处理
 */
export async function markProcessed(
  projectPath: string,
  filePath: string
): Promise<void> {
  await markProcessedBatch(projectPath, [filePath]);
}

/**
 * 批量标记文件已处理（原子操作，避免并发冲突）
 */
export async function markProcessedBatch(
  projectPath: string,
  filePaths: string[]
): Promise<void> {
  if (filePaths.length === 0) return;

  const ontomarkDir = path.join(projectPath, '.ontomark');
  const processedPath = path.join(ontomarkDir, 'processed.json');

  // 确保目录存在
  await fs.mkdir(ontomarkDir, { recursive: true });

  // 读取现有数据
  let data: ProcessedData = { files: {} };
  try {
    const content = await fs.readFile(processedPath, 'utf-8');
    data = JSON.parse(content);
  } catch {
    // 文件不存在，使用默认空数据
  }

  // 计算 ontology.yaml 哈希
  const ontologyResult = await getOntologyPath(projectPath);
  if (ontologyResult.exists) {
    const ontologyContent = await fs.readFile(ontologyResult.path, 'utf-8');
    data.ontologyHash = crypto.createHash('md5').update(ontologyContent).digest('hex');
  }

  // 更新所有文件（并行计算哈希）
  const newEntries = await Promise.all(
    filePaths.map(async (filePath) => {
      const absolutePath = path.join(projectPath, filePath);
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      const hash = crypto.createHash('md5').update(fileContent).digest('hex');
      return {
        filePath,
        lastProcessed: new Date().toISOString(),
        hash,
      };
    })
  );

  for (const entry of newEntries) {
    data.files[entry.filePath] = {
      lastProcessed: entry.lastProcessed,
      hash: entry.hash,
    };
  }

  // 一次性写入
  await fs.writeFile(processedPath, JSON.stringify(data, null, 2), 'utf-8');
}
