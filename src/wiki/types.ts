/**
 * Wiki 相关类型定义
 */

/**
 * Wiki 页面信息
 */
export interface WikiPage {
  /** 实体名称（canonical name） */
  name: string;
  /** 别名列表 */
  aliases: string[];
  /** 实体类型 */
  type: string;
  /** 来源文档列表 */
  sources: string[];
  /** 一句话简介 */
  summary: string;
  /** 关键信息（动态字段） */
  info: Record<string, string>;
  /** 页面正文内容 */
  content: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * Wiki 索引中的实体条目
 */
export interface WikiIndexEntity {
  name: string;
  summary: string;
}

/**
 * Wiki 索引
 */
export interface WikiIndex {
  updatedAt: string;
  entities: Record<string, WikiIndexEntity[]>;
}

/**
 * 从 raw 文档提取的实体信息
 */
export interface ExtractedEntity {
  /** 实体名称 */
  name: string;
  /** 别名 */
  aliases: string[];
  /** 实体类型 */
  type: string;
  /** 在源文档中的上下文片段 */
  context: string[];
  /** 来源文档路径 */
  sourcePath: string;
  /** 提取的关键信息 */
  info: Record<string, string>;
}

/**
 * Wiki 页面 frontmatter 结构
 */
export interface WikiFrontmatter {
  name: string;
  aliases?: string[];
  type: string;
  sources: string[];
  updated: string;
}
