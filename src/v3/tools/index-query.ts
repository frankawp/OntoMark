import * as fs from 'fs/promises';
import * as path from 'path';
import { IndexQueryResult, IndexData } from './types';

/**
 * 查询实体索引
 */
export async function indexQuery(
  projectPath: string,
  name: string,
  fuzzy?: boolean
): Promise<IndexQueryResult> {
  const indexPath = path.join(projectPath, '.ontomark', 'index.json');

  try {
    const content = await fs.readFile(indexPath, 'utf-8');
    const data: IndexData = JSON.parse(content);

    // 直接匹配规范名称
    if (data.entities[name]) {
      const entity = data.entities[name];
      return { found: true, canonical: entity.canonical, type: entity.type, path: entity.path, aliases: entity.aliases };
    }

    // 匹配别名
    if (data.aliases[name]) {
      const canonical = data.aliases[name];
      const entity = data.entities[canonical];
      if (entity) {
        return { found: true, canonical: entity.canonical, type: entity.type, path: entity.path, aliases: entity.aliases };
      }
    }

    // 模糊匹配
    if (fuzzy) {
      const lowerName = name.toLowerCase();
      for (const [canonical, entity] of Object.entries(data.entities)) {
        if (canonical.toLowerCase().includes(lowerName)) {
          return { found: true, canonical: entity.canonical, type: entity.type, path: entity.path, aliases: entity.aliases };
        }
      }
    }

    return { found: false };
  } catch {
    return { found: false };
  }
}
