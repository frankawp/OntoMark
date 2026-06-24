// src/v3/tools/wiki-status.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { WikiStatusResult, WikiFileInfo } from './types';
import { readConfig } from './read-config';

/**
 * 查询 wiki 文件状态
 */
export async function wikiStatus(projectPath: string): Promise<WikiStatusResult> {
  const config = await readConfig(projectPath);
  const wikiDir = path.join(projectPath, config.outputDir);
  const files: WikiFileInfo[] = [];

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
            const stats = await fs.stat(fullPath);

            // 检测是否有人工编辑内容
            const humanEdited = content.includes('<!-- human-edited -->') ||
              parsed.content.includes('<!-- user-content -->');

            files.push({
              path: path.relative(wikiDir, fullPath),
              canonical: parsed.data.canonical || path.basename(entry.name, '.md'),
              type: parsed.data.entity_type || 'Unknown',
              lastModified: stats.mtime.toISOString(),
              humanEdited,
            });
          } catch {
            // 跳过解析失败的文件
          }
        }
      }
    } catch {
      // 目录不存在
    }
  }

  await scanDir(wikiDir);

  return {
    files,
    total: files.length,
  };
}
