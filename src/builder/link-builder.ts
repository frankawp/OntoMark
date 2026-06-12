/**
 * builder/link-builder.ts - Wiki 链接构建器
 *
 * 负责在 Wiki 页面内容中自动生成实体链接
 */
import { EntityCache } from '../storage/cache';
import { findAllLinkableText, insertAllWikiLinks } from '../parser/links';
import { LinkResult } from './types';
import * as fs from 'fs/promises';

/**
 * Wiki 链接构建器
 *
 * 在 Markdown 内容中自动识别实体并添加 WikiLinks
 */
export class LinkBuilder {
  private cache: EntityCache;
  private entityNames: string[];

  /**
   * 创建 LinkBuilder 实例
   *
   * @param cache - 实体缓存
   */
  constructor(cache: EntityCache) {
    this.cache = cache;
    this.entityNames = this.buildEntityIndex();
  }

  /**
   * 构建实体名称索引
   *
   * 从缓存中提取所有实体名称（包含别名对应的规范名称）
   *
   * @returns 实体名称数组
   */
  buildEntityIndex(): string[] {
    const names: Set<string> = new Set();

    // 添加所有实体名称
    for (const name of this.cache.entities.keys()) {
      names.add(name);
    }

    // 添加别名对应的规范名称
    for (const alias of this.cache.aliases.keys()) {
      const canonical = this.cache.aliases.get(alias);
      if (canonical) {
        names.add(canonical);
      }
    }

    return Array.from(names);
  }

  /**
   * 在内容中添加链接
   *
   * 识别内容中的实体名称，并添加 WikiLinks
   *
   * @param content - 原始 Markdown 内容
   * @returns 添加链接后的内容和统计信息
   */
  addLinks(content: string): { content: string; linksAdded: number } {
    const positions = findAllLinkableText(content, this.entityNames);
    const updated = insertAllWikiLinks(content, this.entityNames);

    return {
      content: updated,
      linksAdded: positions.length,
    };
  }

  /**
   * 处理单个文件
   *
   * 读取文件内容，添加链接，并写回文件
   *
   * @param filePath - 文件路径
   * @returns 处理结果
   */
  async processFile(filePath: string): Promise<LinkResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const result = this.addLinks(content);

      // 只有添加了链接才写回文件
      if (result.linksAdded > 0) {
        await fs.writeFile(filePath, result.content, 'utf-8');
      }

      return {
        filePath,
        linksAdded: result.linksAdded,
        linksSkipped: 0,
      };
    } catch {
      return { filePath, linksAdded: 0, linksSkipped: 0 };
    }
  }

  /**
   * 批量处理文件
   *
   * 对多个文件依次添加链接
   *
   * @param filePaths - 文件路径数组
   * @returns 所有文件的处理结果
   */
  async processAll(filePaths: string[]): Promise<LinkResult[]> {
    const results: LinkResult[] = [];
    for (const filePath of filePaths) {
      const result = await this.processFile(filePath);
      results.push(result);
    }
    return results;
  }
}
