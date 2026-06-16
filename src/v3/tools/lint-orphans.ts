import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { LintOrphansResult } from './types';
import { parseWikiLinkTarget } from './normalize';

/**
 * 检查孤立页面（无入链）
 */
export async function lintOrphans(projectPath: string): Promise<LintOrphansResult> {
  const wikiDir = path.join(projectPath, 'wiki');
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
            // 兼容旧格式 canonical 和新格式 name
            const name = parsed.data.name || parsed.data.canonical;

            if (name) {
              entities.add(name);
              const linkPattern = /\[\[([^\]]+)\]\]/g;
              let match;
              while ((match = linkPattern.exec(parsed.content)) !== null) {
                const target = parseWikiLinkTarget(match[1]);
                if (target) {
                  if (!incomingLinks.has(target)) incomingLinks.set(target, new Set());
                  incomingLinks.get(target)!.add(name);
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
