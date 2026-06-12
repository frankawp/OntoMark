/**
 * builder/index-builder.ts - WikiIndexBuilder V2 模块
 *
 * 负责生成 Wiki 索引文件 index.md
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';

/**
 * 索引条目
 */
interface IndexEntry {
  /** 实体名称 */
  name: string;
  /** 实体类型 */
  type: string;
  /** 简介 */
  summary: string;
}

/**
 * Wiki 索引构建器
 *
 * 负责扫描 Wiki 目录并生成 index.md 索引文件
 */
export class WikiIndexBuilder {
  private wikiPath: string;

  constructor(wikiPath: string) {
    this.wikiPath = wikiPath;
  }

  /**
   * 写入 index.md 文件
   */
  async writeIndexFile(): Promise<void> {
    const entries = await this.collectEntries();
    const content = this.generateContent(entries);

    await fs.writeFile(
      path.join(this.wikiPath, 'index.md'),
      content,
      'utf-8'
    );
  }

  /**
   * 收集所有 Wiki 页面信息
   */
  private async collectEntries(): Promise<Map<string, IndexEntry[]>> {
    const entriesByType = new Map<string, IndexEntry[]>();

    const scanDir = async (dir: string) => {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });

        for (const item of items) {
          const fullPath = path.join(dir, item.name);

          if (item.isDirectory()) {
            await scanDir(fullPath);
          } else if (item.isFile() && item.name.endsWith('.md') && item.name !== 'index.md') {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const { data, content: body } = matter(content);

              if (data.canonical && data.entity_type) {
                const entry: IndexEntry = {
                  name: data.canonical,
                  type: data.entity_type,
                  summary: this.extractSummary(body),
                };

                if (!entriesByType.has(data.entity_type)) {
                  entriesByType.set(data.entity_type, []);
                }
                entriesByType.get(data.entity_type)!.push(entry);
              }
            } catch {
              // 跳过解析失败的文件
            }
          }
        }
      } catch {
        // 目录不存在
      }
    };

    await scanDir(this.wikiPath);
    return entriesByType;
  }

  /**
   * 提取正文简介
   *
   * @param body Markdown 正文内容
   * @returns 简介文本（最多50字符）
   */
  private extractSummary(body: string): string {
    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        return trimmed.slice(0, 50) + (trimmed.length > 50 ? '...' : '');
      }
    }
    return '';
  }

  /**
   * 生成索引内容
   *
   * @param entriesByType 按类型分组的条目
   * @returns 格式化的 Markdown 内容
   */
  private generateContent(entriesByType: Map<string, IndexEntry[]>): string {
    const lines: string[] = [];
    const updatedAt = new Date().toISOString().split('T')[0];

    lines.push('# Wiki Index');
    lines.push('');
    lines.push(`> 最后更新：${updatedAt}`);
    lines.push('');

    const sortedTypes = Array.from(entriesByType.keys()).sort();

    for (const type of sortedTypes) {
      const entries = entriesByType.get(type)!;
      lines.push(`## ${type} (${entries.length})`);
      lines.push('');

      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        lines.push(`- [[${entry.name}]] — ${entry.summary}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}
