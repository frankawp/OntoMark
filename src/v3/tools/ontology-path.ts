/**
 * Ontology 路径解析工具
 *
 * 查找顺序：
 * 1. .ontomark/config.json 中配置的 ontologyFile 路径
 * 2. 项目根目录下的 ontology.yaml
 * 3. 项目根目录下的 .ontomark/ontology.yaml
 */
import * as path from 'path';
import * as fs from 'fs/promises';
import { readConfig } from './read-config';

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
  // 优先级1: 读取配置中的 ontologyFile
  let config;
  try {
    config = await readConfig(projectPath);
    if (config.ontologyFile) {
      const configPath = path.join(projectPath, config.ontologyFile);
      try {
        await fs.access(configPath);
        return { exists: true, path: configPath };
      } catch {
        // 配置的路径不存在，继续检查默认位置
      }
    }
  } catch {
    // 配置读取失败，使用默认查找逻辑
  }

  // 优先级2: 项目根目录下的 ontology.yaml
  const rootPath = path.join(projectPath, 'ontology.yaml');
  try {
    await fs.access(rootPath);
    return { exists: true, path: rootPath };
  } catch {
    // 继续检查下一个位置
  }

  // 优先级3: 项目根目录下的 .ontomark/ontology.yaml
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
