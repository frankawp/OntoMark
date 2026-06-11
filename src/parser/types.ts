// src/parser/types.ts
import type { Node } from 'unist';

/**
 * WikiLink 信息
 */
export interface WikiLink {
  /** 链接目标 */
  target: string;
  /** 显示文本 */
  text: string;
  /** 位置信息 */
  position: {
    start: number;
    end: number;
  };
}

/**
 * Markdown 节点（简化版）
 */
export interface MarkdownNode extends Node {
  value?: string;
  children?: MarkdownNode[];
}

/**
 * 解析后的 Markdown 文档
 */
export interface ParsedDocument {
  /** AST 根节点 */
  root: MarkdownNode;
  /** Frontmatter 数据 */
  frontmatter: Record<string, unknown> | null;
  /** 提取的 WikiLinks */
  links: WikiLink[];
  /** 纯文本内容 */
  text: string;
}

/**
 * 链接插入位置
 */
export interface LinkInsertPosition {
  /** 起始偏移 */
  start: number;
  /** 结束偏移 */
  end: number;
  /** 原始文本 */
  text: string;
}
