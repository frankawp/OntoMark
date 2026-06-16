/**
 * 构建实体索引 - 全量重建
 * 扫描 wiki 目录，构建 .ontomark/index.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { IndexData, IndexEntity } from './types';
import { normalizeEntityName } from './normalize';

/**
 * 构建实体索引 - 全量重建
 * @param projectPath 项目根目录路径
 * @returns 构建的索引数据
 */
export async function indexBuild(projectPath: string): Promise<IndexData> {
  const wikiDir = path.join(projectPath, 'wiki');
  const ontomarkDir = path.join(projectPath, '.ontomark');
  const indexPath = path.join(ontomarkDir, 'index.json');

  const entities: Record<string, IndexEntity> = {};
  const aliases: Record<string, string> = {};

  /**
   * 递归扫描目录
   */
  async function scanDir(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const parsed = matter(content);
            // 兼容旧格式 canonical 和新格式 name
            const name = normalizeEntityName(parsed.data.name || parsed.data.canonical || '');
            const type = parsed.data.type || parsed.data.entity_type;
            const entityAliases: string[] = (parsed.data.aliases || []).map((a: string) => normalizeEntityName(a));

            if (name && type) {
              const relativePath = path.relative(wikiDir, fullPath);
              entities[name] = { name, type, path: relativePath, aliases: entityAliases };
              for (const alias of entityAliases) {
                const normalizedAlias = normalizeEntityName(alias);
                if (normalizedAlias) {
                  aliases[normalizedAlias] = name;
                }
              }
            }
          } catch {
            // 跳过无法解析的文件
          }
        }
      }
    } catch {
      // 目录不存在或无法读取，跳过
    }
  }

  await scanDir(wikiDir);

  const data: IndexData = { entities, aliases };
  await fs.mkdir(ontomarkDir, { recursive: true });
  await fs.writeFile(indexPath, JSON.stringify(data, null, 2), 'utf-8');

  return data;
}
