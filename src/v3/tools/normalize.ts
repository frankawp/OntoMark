/**
 * WikiLinks 规范化工具
 *
 * 处理实体名称中的特殊字符和编码问题
 */

/**
 * 解码 HTML 实体
 * 例：&#039; -> ', &amp; -> &, &quot; -> "
 */
function decodeHtmlEntities(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#39;': "'",
    '&#x27;': "'",
    '&apos;': "'",
    '&#x2F;': '/',
    '&#47;': '/',
  };

  let result = str;
  for (const [entity, char] of Object.entries(htmlEntities)) {
    result = result.replace(new RegExp(entity, 'g'), char);
  }

  // 处理数字实体 &#XXX;
  result = result.replace(/&#(\d+);/g, (_, num) => {
    return String.fromCharCode(parseInt(num, 10));
  });

  // 处理十六进制实体 &#xXX;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  return result;
}

/**
 * 规范化实体名称
 *
 * 1. 解码 HTML 实体
 * 2. 移除 URL 编码残留
 * 3. 清理多余空格
 * 4. 处理特殊文件名模式
 */
export function normalizeEntityName(name: string): string {
  let result = name;

  // 1. 解码 HTML 实体
  result = decodeHtmlEntities(result);

  // 2. 解码 URL 编码（如 %20 -> 空格）
  try {
    result = decodeURIComponent(result);
  } catch {
    // 如果解码失败，保持原样
  }

  // 3. 清理多余空格和下划线转空格
  result = result.replace(/_+/g, ' ').trim();
  result = result.replace(/\s+/g, ' ');

  // 4. 移除文件扩展名（如果看起来像文件名）
  if (result.endsWith('.md')) {
    result = result.slice(0, -3);
  }

  // 5. 处理常见编码残留
  result = result.replace(/&#x?[0-9a-fA-F]+;/g, '');

  return result.trim();
}

/**
 * 规范化 WikiLinks 格式
 *
 * 确保链接格式为 [[CanonicalName]]
 */
export function normalizeWikiLink(link: string): string {
  // 移除已有的 [[ ]] 包装
  let name = link.replace(/^\[\[|\]\]$/g, '');
  name = normalizeEntityName(name);
  return `[[${name}]]`;
}

/**
 * 从文本中提取 WikiLinks 并规范化
 */
export function extractAndNormalizeWikiLinks(text: string): string[] {
  const links: string[] = [];
  const pattern = /\[\[([^\]]+)\]\]/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const normalized = normalizeEntityName(match[1]);
    if (normalized && !links.includes(normalized)) {
      links.push(normalized);
    }
  }

  return links;
}

/**
 * 批量规范化文本中的 WikiLinks
 */
export function normalizeWikiLinksInText(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, (_, name) => {
    return normalizeWikiLink(name);
  });
}