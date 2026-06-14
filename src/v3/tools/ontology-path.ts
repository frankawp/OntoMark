/**
 * Ontology 路径解析工具
 *
 * 查找顺序：
 * 1. 项目根目录下的 ontology.yaml
 * 2. 项目根目录下的 .ontomark/ontology.yaml
 */
import * as path from 'path';
import * as fs from 'fs/promises';

export interface OntologyPathResult {
  exists: boolean;
  path: string;
}

/**
 * 获取 ontology.yaml 文件路径
 *
 * @param projectPath 项目路径
 * @returns ontology 文件路径信息
 */
export async function getOntologyPath(projectPath: string): Promise<OntologyPathResult> {
  // 优先级1: 项目根目录下的 ontology.yaml
  const rootPath = path.join(projectPath, 'ontology.yaml');
  try {
    await fs.access(rootPath);
    return { exists: true, path: rootPath };
  } catch {
    // 继续检查下一个位置
  }

  // 优先级2: 项目根目录下的 .ontomark/ontology.yaml
  const dotOntomarkPath = path.join(projectPath, '.ontomark', 'ontology.yaml');
  try {
    await fs.access(dotOntomarkPath);
    return { exists: true, path: dotOntomarkPath };
  } catch {
    // 都不存在
  }

  // 返回默认路径（用于错误提示）
  return { exists: false, path: rootPath };
}
