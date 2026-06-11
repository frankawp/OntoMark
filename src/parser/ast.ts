// src/parser/ast.ts
import unified from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import toString from 'mdast-util-to-string';
import grayMatter from 'gray-matter';
import type { Root } from 'mdast';
import type { ParsedDocument, MarkdownNode, WikiLink } from './types';

/**
 * 解析 Markdown 内容为 AST
 */
export function parseMarkdown(content: string): ParsedDocument {
  // 使用 gray-matter 提取 frontmatter
  const { data, content: markdownContent } = grayMatter(content);

  // 解析 Markdown 内容为 AST（不含 frontmatter）
  const tree = unified()
    .use(remarkParse)
    .parse(markdownContent) as Root;

  // 提取纯文本
  const text = extractText(tree as MarkdownNode);

  // 提取链接（暂不实现，在 links.ts 中实现）
  const links: WikiLink[] = [];

  return {
    root: tree as MarkdownNode,
    frontmatter: Object.keys(data).length > 0 ? data : null,
    links,
    text,
  };
}

/**
 * 从 AST 提取纯文本
 */
export function extractText(node: MarkdownNode): string {
  return toString(node as any);
}

/**
 * 将 AST 序列化为 Markdown
 */
export function stringifyMarkdown(node: MarkdownNode): string {
  const processor = unified().use(remarkStringify);
  const result = processor.stringify(node as any);
  return String(result);
}
