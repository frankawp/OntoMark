// WikiPageBuilder - 从合并实体构建 Wiki 页面

import matter from 'gray-matter';
import { OntologySchema } from '../schema/types';
import { LLMProvider } from '../llm/types';
import { MergedEntity } from './entity-merger';
import { WikiFrontmatter } from '../wiki/types';

/**
 * 构建后的页面结构
 */
export interface BuiltPage {
  /** 实体名称 */
  name: string;
  /** YAML frontmatter */
  frontmatter: WikiFrontmatter;
  /** 完整页面内容（包含 frontmatter 和正文） */
  content: string;
  /** 文件路径 */
  filePath: string;
}

/**
 * WikiPageBuilder - 将合并后的实体转换为 wiki 页面 markdown 文件
 */
export class WikiPageBuilder {
  private schema: OntologySchema;
  private llmProvider?: LLMProvider;

  constructor(schema: OntologySchema, llmProvider?: LLMProvider) {
    this.schema = schema;
    this.llmProvider = llmProvider;
  }

  /**
   * 从合并的实体构建 wiki 页面
   */
  async build(merged: MergedEntity): Promise<BuiltPage> {
    const entityType = this.schema.entity_types[merged.type];
    const template = entityType?.template;

    // 生成 frontmatter
    const frontmatter: WikiFrontmatter = {
      name: merged.name,
      aliases: Array.from(merged.aliases),
      type: merged.type,
      sources: merged.sources,
      updated: new Date().toISOString().split('T')[0],
    };

    // 生成页面内容
    const content = this.generateContent(merged, template);

    // 使用 gray-matter 生成完整页面
    const pageContent = matter.stringify(content, frontmatter);

    return {
      name: merged.name,
      frontmatter,
      content: pageContent,
      filePath: this.generateFilePath(merged.name),
    };
  }

  /**
   * 生成页面正文内容
   */
  private generateContent(merged: MergedEntity, template?: any): string {
    const lines: string[] = [];

    // 标题
    lines.push(`# ${merged.name}`);
    lines.push('');

    // 简介（如果有上下文，取第一条作为临时简介）
    if (merged.context.length > 0) {
      lines.push(merged.context[0]);
      lines.push('');
    }

    // 关键信息表
    if (Object.keys(merged.info).length > 0) {
      lines.push('## 关键信息');
      lines.push('');
      lines.push('| 字段 | 值 |');
      lines.push('| --- | --- |');
      for (const [key, value] of Object.entries(merged.info)) {
        lines.push(`| ${key} | ${value} |`);
      }
      lines.push('');
    }

    // 来源
    lines.push('## 来源');
    lines.push('');
    for (const source of merged.sources) {
      const fileName = source.split('/').pop()?.replace('.md', '') || source;
      lines.push(`- [[${fileName}]]`);
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * 生成文件路径
   */
  private generateFilePath(name: string): string {
    // 清理文件名
    const sanitizedName = name
      .replace(/\s+/g, '_')
      .replace(/[^\w\-一-鿿]/g, '');
    return `${sanitizedName}.md`;
  }
}