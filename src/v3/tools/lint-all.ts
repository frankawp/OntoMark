import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { LintAllResult } from './types';
import { lintOrphans } from './lint-orphans';
import { lintMissing } from './lint-missing';

/**
 * 综合检查
 */
export async function lintAll(projectPath: string): Promise<LintAllResult> {
  const wikiDir = path.join(projectPath, 'wiki');
  const orphansResult = await lintOrphans(projectPath);
  const missingResult = await lintMissing(projectPath);

  const empty: string[] = [];
  async function scanForEmpty(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanForEmpty(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const parsed = matter(content);
            const canonical = parsed.data.canonical;
            const bodyText = parsed.content.replace(/\s+/g, '').replace(/#+\s*/g, '');
            if (canonical && bodyText.length < 50) {
              empty.push(canonical);
            }
          } catch {}
        }
      }
    } catch {}
  }

  await scanForEmpty(wikiDir);

  const totalIssues = orphansResult.orphans.length + missingResult.missing.length + empty.length;

  return {
    orphans: orphansResult.orphans,
    missing: missingResult.missing,
    empty,
    totalIssues,
  };
}
