import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { LintOrphansResult } from './types';
import { parseWikiLinkTarget } from './normalize';

/**
 * 检查孤立页面（无入链）
 *
 * @param projectPath 项目路径
 * @param wikiDir wiki 目录（由 lint-all 传入，或由 readConfig 自行读取）
 */
export async function lintOrphans(projectPath: string, wikiDir?: string): Promise<LintOrphansResult> {
  // 如果没有传入 wikiDir，从配置读取
  if (!wikiDir) {
    const { readConfig } = await import('./read-config');
    const config = await readConfig(projectPath);
    wikiDir = path.join(projectPath, config.outputDir);
  }

  const entities = new Set<string>();
  const incomingLinks = new Map<string, Set<string>>();

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
              entities.add(canonical);
              const linkPattern = /\[\[([^\]]+)\]\]/g;
              let match;
              while ((match = linkPattern.exec(parsed.content)) !== null) {
                const target = parseWikiLinkTarget(match[1]);
                if (target) {
                  if (!incomingLinks.has(target)) incomingLinks.set(target, new Set());
                  incomingLinks.get(target)!.add(canonical);
                }
              }
            }
          } catch {}
        }
      }
    } catch {}
  }

  await scanDir(wikiDir);

  const orphans: string[] = [];
  for (const entity of entities) {
    if (!incomingLinks.has(entity) || incomingLinks.get(entity)!.size === 0) {
      orphans.push(entity);
    }
  }

  return { orphans };
}
