import * as fs from 'fs/promises';
import * as path from 'path';
import { IndexQueryResult, IndexData } from './types';

interface Candidate {
  canonical: string;
  entity: { canonical: string; type: string; path: string; aliases: string[] };
  score: number; // 匹配分数：3=完全匹配, 2=别名匹配, 1.5=前缀匹配, 1=包含匹配
}

/**
 * 查询实体索引
 *
 * 匹配优先级：
 * 1. 完全匹配规范名称
 * 2. 别名完全匹配
 * 3. 前缀匹配（名称以查询开头）
 * 4. 包含匹配（名称包含查询）
 *
 * @param projectPath 项目路径
 * @param name 查询名称
 * @param fuzzy 是否启用模糊匹配
 * @returns 最匹配的实体，或未找到
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

    if (!data.entities || Object.keys(data.entities).length === 0) {
      return { found: false };
    }

    // 1. 完全匹配规范名称
    if (data.entities[name]) {
      const entity = data.entities[name];
      return { found: true, canonical: entity.canonical, type: entity.type, path: entity.path, aliases: entity.aliases };
    }

    // 2. 别名完全匹配
    if (data.aliases[name]) {
      const canonical = data.aliases[name];
      const entity = data.entities[canonical];
      if (entity) {
        return { found: true, canonical: entity.canonical, type: entity.type, path: entity.path, aliases: entity.aliases };
      }
    }

    // 非模糊模式到这里就返回未找到
    if (!fuzzy) {
      return { found: false };
    }

    // 3. 模糊匹配：收集所有候选并按分数排序
    const lowerName = name.toLowerCase();
    const candidates: Candidate[] = [];

    for (const [canonical, entity] of Object.entries(data.entities)) {
      const lowerCanonical = canonical.toLowerCase();

      if (lowerCanonical === lowerName) {
        // 大小写不同的完全匹配（比完全一样低一分，但比模糊匹配高）
        candidates.push({ canonical, entity, score: 2.5 });
      } else if (lowerCanonical.startsWith(lowerName)) {
        candidates.push({ canonical, entity, score: 1.5 });
      } else if (lowerCanonical.includes(lowerName)) {
        candidates.push({ canonical, entity, score: 1 });
      } else {
        // 检查别名是否匹配
        for (const alias of entity.aliases) {
          const lowerAlias = alias.toLowerCase();
          if (lowerAlias === lowerName) {
            candidates.push({ canonical, entity, score: 2 });
            break;
          } else if (lowerAlias.includes(lowerName)) {
            candidates.push({ canonical, entity, score: 0.8 });
            break;
          }
        }
      }
    }

    // 按分数降序排序，取最高分
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length > 0 && candidates[0].score >= 0.8) {
      const best = candidates[0];
      return {
        found: true,
        canonical: best.entity.canonical,
        type: best.entity.type,
        path: best.entity.path,
        aliases: best.entity.aliases,
      };
    }

    return { found: false };
  } catch {
    return { found: false };
  }
}
