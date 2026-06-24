import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { LintMissingResult, MissingLink } from './types';
import { normalizeEntityName, parseWikiLinkTarget } from './normalize';

/**
 * 检查缺失链接（引用了不存在的实体）
 *
 * 两遍扫描：
 * 1. 先收集所有实体的规范名称
 * 2. 再遍历所有文件检查 WikiLinks，引用不在集合中的即为缺失
 *
 * @param projectPath 项目路径
 * @param wikiDir wiki 目录（由 lint-all 传入，或自行读取配置）
 */
export async function lintMissing(projectPath: string, wikiDir?: string): Promise<LintMissingResult> {
  // 如果没有传入 wikiDir，从配置读取
  if (!wikiDir) {
    const { readConfig } = await import('./read-config');
    const config = await readConfig(projectPath);
    wikiDir = path.join(projectPath, config.outputDir);
  }

  // 第一遍：收集所有实体名称
  const entities = await collectEntityNames(wikiDir);

  // 第二遍：检查所有链接，找出缺失的
  const missing = await findMissingLinks(wikiDir, entities);

  return { missing };
}

/**
 * 收集所有实体的规范名称
 */
async function collectEntityNames(wikiDir: string): Promise<Set<string>> {
  const entities = new Set<string>();

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
            const canonical = parsed.data.canonical;
            if (canonical) {
              entities.add(normalizeEntityName(canonical));
            }
          } catch { /* 跳过无法解析的文件 */ }
        }
      }
    } catch { /* 目录不存在则跳过 */ }
  }

  await scanDir(wikiDir);
  return entities;
}

/**
 * 查找引用了不存在实体的链接
 */
async function findMissingLinks(
  wikiDir: string,
  entities: Set<string>
): Promise<MissingLink[]> {
  const references = new Map<string, Set<string>>();

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
            const source = normalizeEntityName(parsed.data.canonical || '');
            if (!source) continue;

            const linkPattern = /\[\[([^\]]+)\]\]/g;
            let match;
            while ((match = linkPattern.exec(parsed.content)) !== null) {
              const target = parseWikiLinkTarget(match[1]);
              if (target && !entities.has(target)) {
                if (!references.has(target)) {
                  references.set(target, new Set());
                }
                references.get(target)!.add(source);
              }
            }
          } catch { /* 跳过无法解析的文件 */ }
        }
      }
    } catch { /* 目录不存在则跳过 */ }
  }

  await scanDir(wikiDir);

  // 转换为输出格式
  const missing: MissingLink[] = [];
  for (const [target, refBy] of references) {
    missing.push({ entity: target, referencedBy: [...refBy] });
  }

  return missing;
}
