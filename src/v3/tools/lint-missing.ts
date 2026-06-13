import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { LintMissingResult, MissingLink } from './types';
import { normalizeEntityName } from './normalize';

/**
 * 检查缺失链接（引用了不存在的实体）
 */
export async function lintMissing(projectPath: string): Promise<LintMissingResult> {
  const wikiDir = path.join(projectPath, 'wiki');
  const entities = new Set<string>();
  const references = new Map<string, string[]>();

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
              const normalizedCanonical = normalizeEntityName(canonical);
              entities.add(normalizedCanonical);
              const linkPattern = /\[\[([^\]]+)\]\]/g;
              let match;
              while ((match = linkPattern.exec(parsed.content)) !== null) {
                const target = normalizeEntityName(match[1]);
                if (target && !entities.has(target)) {
                  if (!references.has(target)) references.set(target, []);
                  references.get(target)!.push(normalizedCanonical);
                }
              }
            }
          } catch {}
        }
      }
    } catch {}
  }

  await scanDir(wikiDir);

  const missing: MissingLink[] = [];
  for (const [target, refBy] of references) {
    const normalizedTarget = normalizeEntityName(target);
    if (!entities.has(normalizedTarget)) {
      missing.push({ entity: normalizedTarget, referencedBy: [...new Set(refBy)] });
    }
  }

  return { missing };
}
