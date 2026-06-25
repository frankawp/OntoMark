/**
 * 构建实体索引 - 全量重建
 * 扫描输出目录，构建 .ontomark/index.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { IndexData, IndexEntity } from './types';
import { normalizeEntityName } from './normalize';
import { readConfig } from './read-config';

interface IndexEntry {
  canonical: string;
  type: string;
  summary: string;
  updated: string;
}

/**
 * 构建实体索引 - 全量重建
 * @param projectPath 项目根目录路径
 * @returns 构建的索引数据
 */
export async function indexBuild(projectPath: string): Promise<IndexData> {
  const config = await readConfig(projectPath);
  const wikiDir = path.join(projectPath, config.outputDir);
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
        } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md') {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const parsed = matter(content);
            const canonical = normalizeEntityName(parsed.data.canonical || '');
            const type = parsed.data.entity_type;
            const entityAliases: string[] = (parsed.data.aliases || []).map((a: string) => normalizeEntityName(a));

            if (canonical && type) {
              const relativePath = path.relative(wikiDir, fullPath);
              entities[canonical] = { canonical, type, path: relativePath, aliases: entityAliases };
              for (const alias of entityAliases) {
                const normalizedAlias = normalizeEntityName(alias);
                if (normalizedAlias) {
                  aliases[normalizedAlias] = canonical;
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

  // 生成 index.md
  const entries: IndexEntry[] = [];
  for (const [canonical, entity] of Object.entries(entities)) {
    const fullPath = path.join(wikiDir, entity.path);
    const summary = await extractSummary(fullPath, canonical);
    entries.push({ canonical, type: entity.type, summary, updated: '' });
  }

  // 按 type 分组
  const grouped: Record<string, IndexEntry[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.type]) grouped[entry.type] = [];
    grouped[entry.type].push(entry);
  }
  // 每组内按 canonical 排序
  for (const type of Object.keys(grouped)) {
    grouped[type].sort((a, b) => a.canonical.localeCompare(b.canonical));
  }

  // 生成 index.md 内容
  const now = new Date().toISOString().split('T')[0];
  let indexContent = `# Wiki Index\n\n_最后更新：${now} | 共 ${entries.length} 个实体_\n\n`;

  for (const [type, typeEntries] of Object.entries(grouped)) {
    indexContent += `## ${type}\n\n`;
    for (const entry of typeEntries) {
      indexContent += `- [[${entry.canonical}]] — ${entry.summary || ''}\n`;
    }
    indexContent += '\n';
  }

  const indexPathMd = path.join(wikiDir, 'index.md');
  await fs.writeFile(indexPathMd, indexContent.trimEnd() + '\n', 'utf-8');

  return data;
}

/**
 * 提取实体文件的一行摘要
 * 优先取 frontmatter description，无则取正文第一段（前 100 字符），回退使用 canonical 名称
 */
async function extractSummary(filePath: string, canonical: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(content);
    // 1. 优先取 frontmatter description
    if (parsed.data.description && typeof parsed.data.description === 'string') {
      return parsed.data.description.trim();
    }
    // 2. 取正文第一段（# 标题后的第一个非空段落）
    const body = parsed.content.trim();
    const lines = body.split('\n');
    let inSummary = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        inSummary = true;
        continue;
      }
      if (inSummary && trimmed.length > 0 && !trimmed.startsWith('#')) {
        // 截取前 100 字符
        return trimmed.length > 100 ? trimmed.substring(0, 100) + '…' : trimmed;
      }
    }
    // 3. 回退：使用 canonical
    return canonical;
  } catch {
    return canonical;
  }
}
