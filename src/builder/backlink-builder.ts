import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { ResolvedEntity } from '../discovery/types';

export class BacklinkBuilder {
  constructor(private readonly wikiPath: string) {}

  async build(entities: ResolvedEntity[]): Promise<void> {
    const pages = await this.scanMarkdown(this.wikiPath);

    // 第一步：建立反向索引 - 哪些页面引用了哪些实体
    const backlinkIndex = new Map<string, Set<string>>();

    // 读取所有页面内容一次，建立索引
    const pageContents = new Map<string, { content: string; canonical: string }>();
    for (const page of pages) {
      const content = await fs.readFile(page, 'utf-8');
      const parsed = matter(content);
      const canonical = parsed.data.canonical || path.basename(page, '.md');
      pageContents.set(page, { content, canonical });
    }

    // 为每个实体查找反向链接
    for (const entity of entities) {
      const backlinks = new Set<string>();

      // 检查哪些页面包含指向该实体的链接
      for (const [page, { content, canonical }] of pageContents) {
        if (content.includes(`[[${entity.canonicalName}]]`)) {
          backlinks.add(canonical);
        }
      }

      // 更新实体的 Wiki 页面
      const target = path.join(this.wikiPath, this.pagePath(entity));
      let content: string;
      try {
        content = await fs.readFile(target, 'utf-8');
      } catch {
        continue;
      }

      const replacement = backlinks.size === 0
        ? '## Referenced By\n\n*No backlinks yet.*'
        : `## Referenced By\n\n${Array.from(backlinks).sort().map(name => `- [[${name}]]`).join('\n')}`;

      const updated = content.replace(/## Referenced By\n\n[\s\S]*?(?=\n## |\n<!-- ONTOMARK:END generated -->)/, replacement);
      await fs.writeFile(target, updated, 'utf-8');
    }
  }

  private pagePath(entity: ResolvedEntity): string {
    const sanitized = entity.canonicalName.replace(/\s+/g, '_').replace(/[^\w\-一-鿿]/g, '');
    return `${entity.entityType}s/${sanitized}.md`;
  }

  private async scanMarkdown(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.scanMarkdown(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
    return files;
  }
}
