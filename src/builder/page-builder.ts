/**
 * builder/page-builder.ts - Wiki 页面构建器
 *
 * 负责将 ResolvedEntity 构建成完整的 Wiki 页面
 */
import matter from 'gray-matter';
import { OntologySchema, EntityTemplate } from '../schema/types';
import { ResolvedEntity } from '../discovery/types';
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
   * 构建完整的 Wiki 页面
   * @param entity 消歧后的实体
   * @returns 构建后的页面
   */
  build(entity: ResolvedEntity): BuiltPage {
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

    // 添加可选字段（仅在有值时添加）
    if (entity.aliases.length > 0) {
      frontmatter.aliases = entity.aliases;
    }
    if (entity.needsReview) {
      frontmatter.needs_review = true;
    }

    // 生成正文
    const body = this.generateBody(entity, template);

    // 组合成完整内容（frontmatter + body）
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
   * @param entity 实体
   * @param template 实体类型模板
   * @returns 正文内容
   */
  private generateBody(entity: ResolvedEntity, template?: EntityTemplate): string {
    const lines: string[] = [];

    // 标题
    lines.push(`# ${entity.canonicalName}`);
    lines.push('');

    // 如果有上下文，添加简介
    if (entity.sources.length > 0 && entity.sources[0].context) {
      lines.push(entity.sources[0].context);
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
        lines.push(`| ${field.key} | *待补充* |`);
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

    return lines.join('\n');
  }

  /**
   * 生成文件路径
   * @param name 实体名称
   * @param entityType 实体类型
   * @returns 文件路径
   */
  private generateFilePath(name: string, entityType: string): string {
    // 清理名称：替换空格、移除特殊字符
    const sanitizedName = name
      .replace(/\s+/g, '_')
      .replace(/[^\w\-一-鿿]/g, '');

    // 格式: {entityType}s/{name}.md
    return `${entityType}s/${sanitizedName}.md`;
  }
}
