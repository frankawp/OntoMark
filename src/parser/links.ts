// src/parser/links.ts
import visit from 'unist-util-visit';
import type { Text } from 'mdast';
import { MarkdownNode, WikiLink, LinkInsertPosition } from './types';

const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * 从 AST 提取所有 WikiLinks
 */
export function extractWikiLinks(node: MarkdownNode): WikiLink[] {
  const links: WikiLink[] = [];

  visit(node as any, 'text', (textNode: Text) => {
    const text = textNode.value;
    let match;

    while ((match = WIKI_LINK_REGEX.exec(text)) !== null) {
      links.push({
        target: match[1],
        text: match[2] || match[1],
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    }
  });

  return links;
}

/**
 * 在指定位置插入链接
 */
export function insertWikiLink(
  content: string,
  start: number,
  end: number,
  target: string
): string {
  const before = content.slice(0, start);
  const after = content.slice(end);
  const text = content.slice(start, end);

  // 检查是否已经在链接中
  const contextBefore = before.slice(-20);
  if (contextBefore.includes('[[') && !contextBefore.includes(']]')) {
    return content;
  }

  if (text.startsWith('[[') || text.endsWith(']]')) {
    return content;
  }

  return `${before}[[${target}]]${after}`;
}

/**
 * 找到所有可链接的文本位置
 * 优化：合并所有实体名称为单个正则表达式，避免 O(n*m*k) 复杂度
 */
export function findAllLinkableText(
  content: string,
  entityNames: string[]
): LinkInsertPosition[] {
  const positions: LinkInsertPosition[] = [];

  // 边界情况：空数组直接返回
  if (entityNames.length === 0) {
    return positions;
  }

  // 找出所有已链接的范围
  const linkedRanges: Array<{ start: number; end: number }> = [];
  let match;
  while ((match = WIKI_LINK_REGEX.exec(content)) !== null) {
    linkedRanges.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // 按长度排序（长的先匹配，避免短名称误匹配长的子串）
  const sortedNames = [...entityNames].sort((a, b) => b.length - a.length);

  // 合并为单个正则表达式
  const pattern = sortedNames.map(escapeRegex).join('|');
  const regex = new RegExp(`\\b(${pattern})\\b`, 'g');

  while ((match = regex.exec(content)) !== null) {
    const matchedText = match[1];
    const start = match.index;
    const end = start + matchedText.length;

    // 检查是否已在链接范围内
    const isLinked = linkedRanges.some(
      range => (start >= range.start && start < range.end) ||
               (end > range.start && end <= range.end)
    );

    if (!isLinked) {
      positions.push({ start, end, text: matchedText });
    }
  }

  // 按位置倒序排列，便于从后向前插入
  return positions.sort((a, b) => b.start - a.start);
}

/**
 * 批量插入 WikiLinks
 */
export function insertAllWikiLinks(
  content: string,
  entityNames: string[]
): string {
  const positions = findAllLinkableText(content, entityNames);

  let result = content;
  for (const pos of positions) {
    result = insertWikiLink(result, pos.start, pos.end, pos.text);
  }

  return result;
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}