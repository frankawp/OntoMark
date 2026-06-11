import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { WikiIndex, WikiIndexEntity } from './types';

/**
 * Wiki 索引构建器
 * 扫描 wiki 目录并生成 index.md 索引文件
 */
export class WikiIndexBuilder {
  private wikiPath: string;

  constructor(wikiPath: string) {
    this.wikiPath = wikiPath;
  }

  /**
   * 扫描 wiki 目录，构建索引
   */
  async build(): Promise<WikiIndex> {
    const index: WikiIndex = {
      updatedAt: new Date().toISOString().split('T')[0],
      entities: {},
    };

    const files = await this.scanWikiFiles();

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const { data, content: body } = matter(content);

        if (!data.name || !data.type) continue;

        // 提取简介（取正文第一段）
        const summary = this.extractSummary(body);

        const entry: WikiIndexEntity = {
          name: data.name,
          summary,
        };

        if (!index.entities[data.type]) {
          index.entities[data.type] = [];
        }
        index.entities[data.type].push(entry);
      } catch (error) {
        // 跳过解析失败的文件
        continue;
      }
    }

    return index;
  }

  /**
   * 写入 index.md 文件
   */
  async writeIndexFile(): Promise<void> {
    const index = await this.build();
    const content = this.generateIndexContent(index);

    await fs.writeFile(
      path.join(this.wikiPath, 'index.md'),
      content,
      'utf-8'
    );
  }

  /**
   * 扫描 wiki 文件
   */
  private async scanWikiFiles(): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(this.wikiPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md') {
        files.push(path.join(this.wikiPath, entry.name));
      }
    }

    return files;
  }

  /**
   * 提取正文简介
   */
  private extractSummary(body: string): string {
    // 去掉标题，取第一段非空文本
    const lines = body.split('\n');
    let summary = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        summary = trimmed.slice(0, 50);
        if (trimmed.length > 50) summary += '...';
        break;
      }
    }

    return summary;
  }

  /**
   * 生成 index.md 内容
   */
  private generateIndexContent(index: WikiIndex): string {
    const lines: string[] = [];

    lines.push('# Wiki Index');
    lines.push('');
    lines.push(`> 最后更新：${index.updatedAt}`);
    lines.push('');

    for (const [type, entities] of Object.entries(index.entities)) {
      lines.push(`## ${type} (${entities.length})`);
      lines.push('');

      for (const entity of entities) {
        lines.push(`- [[${entity.name}]] — ${entity.summary}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}