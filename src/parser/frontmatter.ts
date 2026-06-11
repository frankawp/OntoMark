// src/parser/frontmatter.ts
import matter from 'gray-matter';
import { parseMarkdown } from './ast';
import type { MarkdownNode } from './types';

/**
 * 解析 frontmatter
 * @param content Markdown 内容
 * @returns frontmatter 数据和正文内容
 */
export function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const result = matter(content);
  return {
    data: result.data as Record<string, unknown>,
    content: result.content,
  };
}

/**
 * 更新 frontmatter
 * @param content 原始 Markdown 内容
 * @param updates 要更新的字段
 * @returns 更新后的 Markdown 内容
 */
export function updateFrontmatter(
  content: string,
  updates: Record<string, unknown>
): string {
  const result = matter(content);
  const newData = { ...result.data, ...updates };
  return matter.stringify(result.content, newData);
}

/**
 * 验证 frontmatter 是否包含必需字段
 * @param data frontmatter 数据
 * @param requiredFields 必需字段列表
 * @returns 是否验证通过
 */
export function validateFrontmatter(
  data: Record<string, unknown>,
  requiredFields: string[]
): boolean {
  return requiredFields.every(field => data[field] !== undefined && data[field] !== null);
}

/**
 * 从 AST 提取 frontmatter 数据
 * @param node Markdown AST 节点
 * @returns frontmatter 数据或 null
 */
export function extractFrontmatter(node: MarkdownNode): Record<string, unknown> | null {
  if (!node.children) return null;

  for (const child of node.children) {
    if (child.type === 'yaml' && 'value' in child) {
      try {
        // 使用 gray-matter 解析 YAML
        const result = matter(`---\n${child.value}\n---\n`);
        return result.data as Record<string, unknown>;
      } catch {
        return null;
      }
    }
  }

  return null;
}