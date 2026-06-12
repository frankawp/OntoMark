/**
 * builder/page-builder.ts - Wiki 页面构建器
 *
 * 负责将 ResolvedEntity 构建成完整的 Wiki 页面
 */
import matter from 'gray-matter';
import { OntologySchema, EntityTemplate } from '../schema/types';
import { ResolvedEntity, ResolvedEvent, ResolvedStatement } from '../discovery/types';
import { BuiltPage, WikiFrontmatter } from './types';

/**
 * Wiki 页面构建器
 * 将消歧后的实体构建成 Wiki 页面
 */
export class WikiPageBuilder {
  private schema: OntologySchema;

  constructor(schema: OntologySchema) {
    this.schema = schema;
  }

  /**
   * 构建实体 Wiki 页面
   */
  build(entity: ResolvedEntity, existingContent?: string): BuiltPage {
    const entityType = this.schema.entity_types[entity.entityType];
    const template = entityType?.template;

    // 构建 frontmatter（过滤 undefined 值）
    const frontmatter: WikiFrontmatter = {
      canonical: entity.canonicalName,
      entity_type: entity.entityType,
      sources: entity.sources.map(s => ({
        file: s.file,
        lines: [s.line],
      })),
      status: entity.needsReview ? 'draft' : 'canonical',
      last_updated: new Date().toISOString().split('T')[0],
    };

    if (entity.aliases.length > 0) {
      frontmatter.aliases = entity.aliases;
    }
    if (entity.needsReview) {
      frontmatter.needs_review = true;
    }

    const generatedBody = this.generateEntityBody(entity, template);
    const body = this.mergeWithExistingBody(generatedBody, existingContent);

    const content = matter.stringify(body, frontmatter as any);

    return {
      name: entity.canonicalName,
      entityType: entity.entityType,
      filePath: this.generateFilePath(entity.canonicalName, entity.entityType),
      frontmatter,
      content,
    };
  }

  /**
   * 生成页面正文
   */
  private generateEntityBody(entity: ResolvedEntity, template?: EntityTemplate): string {
    const lines: string[] = [];

    lines.push(`# ${entity.canonicalName}`);
    lines.push('');
    lines.push('<!-- ONTOMARK:BEGIN generated -->');
    lines.push('');

    // 从上下文中提取简介（合并所有上下文）
    const contexts = entity.sources
      .map(s => s.context)
      .filter(Boolean)
      .join('\n\n');

    if (contexts) {
      lines.push(contexts);
      lines.push('');
    }

    // 根据模板生成结构化内容
    if (template?.summary) {
      lines.push(`## ${template.summary}`);
      lines.push('');
      lines.push('*待补充*');
      lines.push('');
    }

    // 信息表格
    if (template?.info && template.info.length > 0) {
      lines.push('## 关键信息');
      lines.push('');
      lines.push('| 字段 | 值 |');
      lines.push('| --- | --- |');
      for (const field of template.info) {
        // 优先使用 entity.info 中的值
        const value = entity.info?.[field.key] || '*待补充*';
        lines.push(`| ${field.key} | ${value} |`);
      }
      lines.push('');
    }

    // 来源部分
    lines.push('## 来源');
    lines.push('');
    for (const source of entity.sources) {
      const fileName = source.file.split('/').pop()?.replace('.md', '') || source.file;
      lines.push(`- [[${fileName}]] (line ${source.line})`);
    }
    lines.push('');

    lines.push('## Referenced By');
    lines.push('');
    lines.push('*No backlinks yet.*');
    lines.push('');

    lines.push('<!-- ONTOMARK:END generated -->');
    lines.push('');

    return lines.join('\n');
  }

  private mergeWithExistingBody(generatedBody: string, existingContent?: string): string {
    if (!existingContent) {
      return generatedBody;
    }

    const parsed = matter(existingContent);
    const existingBody = parsed.content.trim();
    const generatedMatch = generatedBody.match(/<!-- ONTOMARK:BEGIN generated -->[\s\S]*?<!-- ONTOMARK:END generated -->/);
    const generatedBlock = generatedMatch?.[0] || generatedBody;

    if (!existingBody) {
      return generatedBody;
    }

    const withoutManaged = existingBody
      .replace(/<!-- ONTOMARK:BEGIN generated -->[\s\S]*?<!-- ONTOMARK:END generated -->/g, '')
      .replace(new RegExp(`^#\\s+${escapeRegex(parsed.data.canonical || '')}\\s*`, 'm'), '')
      .trim();

    const title = generatedBody.split('\n')[0];
    return [title, '', generatedBlock, '', withoutManaged].filter(Boolean).join('\n');
  }

  private generateFilePath(name: string, entityType: string): string {
    const sanitizedName = name
      .replace(/\s+/g, '_')
      .replace(/[^\w\-一-鿿]/g, '');
    return `${entityType}s/${sanitizedName}.md`;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
