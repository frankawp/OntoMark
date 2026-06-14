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
 * 标记文件已处理
 */
export async function markProcessed(
  projectPath: string,
  filePath: string
): Promise<void> {
  const ontomarkDir = path.join(projectPath, '.ontomark');
  const processedPath = path.join(ontomarkDir, 'processed.json');
  const absolutePath = path.join(projectPath, filePath);

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

  // 计算文件哈希
  const fileContent = await fs.readFile(absolutePath, 'utf-8');
  const hash = crypto.createHash('md5').update(fileContent).digest('hex');

  // 计算 ontology.yaml 哈希
  const ontologyResult = await getOntologyPath(projectPath);
  if (ontologyResult.exists) {
    const ontologyContent = await fs.readFile(ontologyResult.path, 'utf-8');
    data.ontologyHash = crypto.createHash('md5').update(ontologyContent).digest('hex');
  }

  // 更新数据
  data.files[filePath] = {
    lastProcessed: new Date().toISOString(),
    hash,
  };

  // 写入文件
  await fs.writeFile(processedPath, JSON.stringify(data, null, 2), 'utf-8');
}