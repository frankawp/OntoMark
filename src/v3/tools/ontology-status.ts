import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as yaml from 'yaml';
import { OntologyStatusResult, EntityTypeDef } from './types';

/**
 * 查询 ontology 状态
 *
 * @param projectPath 项目路径
 * @returns ontology 状态信息
 */
export async function ontologyStatus(projectPath: string): Promise<OntologyStatusResult> {
  const ontologyPath = path.join(projectPath, 'ontology.yaml');

  try {
    const content = await fs.readFile(ontologyPath, 'utf-8');
    const hash = crypto.createHash('md5').update(content).digest('hex');
    const stats = await fs.stat(ontologyPath);

    const parsed = yaml.parse(content);
    const entityTypes: Record<string, EntityTypeDef> = {};

    // 添加 null 检查，yaml.parse('') 返回 null
    if (parsed?.entity_types) {
      for (const [name, def] of Object.entries(parsed.entity_types)) {
        entityTypes[name] = def as EntityTypeDef;
      }
    }

    return {
      exists: true,
      path: ontologyPath,
      hash,
      lastModified: stats.mtime.toISOString(),
      entityTypes,
    };
  } catch {
    return {
      exists: false,
      path: ontologyPath,
      hash: '',
      lastModified: '',
      entityTypes: {},
    };
  }
}
