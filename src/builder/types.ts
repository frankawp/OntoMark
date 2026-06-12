/**
 * builder/types.ts - Builder 模块类型定义
 *
 * 负责定义 Wiki 页面构建相关的类型
 */

/**
 * 来源信息
 */
export interface SourceInfo {
  /** 来源文件路径 */
  file: string;
  /** 来源行号（可选） */
  lines?: number[];
}

/**
 * Wiki 页面 Frontmatter（V2 格式）
 */
export interface WikiFrontmatter {
  /** 规范名称 */
  canonical: string;
  /** 实体类型 */
  entity_type: string;
  /** 别名列表（可选） */
  aliases?: string[];
  /** 来源信息 */
  sources: SourceInfo[];
  /** 状态：canonical（规范）或 draft（草稿） */
  status: 'canonical' | 'draft';
  /** 是否需要审核（可选） */
  needs_review?: boolean;
  /** 最后更新时间（可选） */
  last_updated?: string;
  /** 发生日期（事件专用） */
  date?: string;
  /** 发言人（声明专用） */
  speaker?: string;
  /** 发言人角色（声明专用） */
  speaker_role?: string;
}

/**
 * 构建后的 Wiki 页面
 */
export interface BuiltPage {
  /** 实体名称 */
  name: string;
  /** 实体类型 */
  entityType: string;
  /** 文件路径 */
  filePath: string;
  /** Frontmatter */
  frontmatter: WikiFrontmatter;
  /** 完整内容 */
  content: string;
}

/**
 * 链接构建结果
 */
export interface LinkResult {
  /** 文件路径 */
  filePath: string;
  /** 添加的链接数 */
  linksAdded: number;
  /** 跳过的链接数 */
  linksSkipped: number;
}

/**
 * 页面构建选项
 */
export interface PageBuildOptions {
  /** 是否包含来源详情 */
  includeSources?: boolean;
  /** 是否生成相关链接 */
  generateRelated?: boolean;
}