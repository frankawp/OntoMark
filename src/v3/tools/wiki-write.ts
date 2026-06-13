import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { WikiWriteInput, WikiWriteResult } from './types';
import { ontologyStatus } from './ontology-status';

/**
 * 写入 wiki 页面
 *
 * 原子化操作：
 * 1. 验证文件存在状态与 isUpdate 匹配
 * 2. 加载 ontology 验证类型
 * 3. 生成 frontmatter
 * 4. 生成 body
 * 5. 写入文件
 */
export async function wikiWrite(input: WikiWriteInput): Promise<WikiWriteResult> {
  const { projectPath, canonical, type, aliases, info, content, sources, needsReview, isUpdate } = input;

  const sanitizedName = canonical
    .replace(/\s+/g, '_')
    .replace(/[^\w\-一-鿿]/g, '');
  const typeDir = `${type}s`;
  const filePath = path.join(projectPath, 'wiki', typeDir, `${sanitizedName}.md`);

  // 检查文件存在状态
  const exists = await fs.access(filePath).then(() => true).catch(() => false);
  if (isUpdate && !exists) {
    throw new Error(`Cannot update: file does not exist: ${filePath}`);
  }
  if (!isUpdate && exists) {
    throw new Error(`Cannot create: file already exists: ${filePath}`);
  }

  // 验证 ontology
  const ontology = await ontologyStatus(projectPath);
  if (!ontology.exists) {
    throw new Error('ontology.yaml not found');
  }
  if (!ontology.entityTypes[type]) {
    throw new Error(`Unknown entity type: ${type}`);
  }

  let frontmatter: Record<string, any>;
  let body: string;

  if (isUpdate && exists) {
    const existing = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(existing);

    const existingAliases: string[] = parsed.data.aliases || [];
    const mergedAliases = [...new Set([...existingAliases, ...(aliases || [])])];

    frontmatter = {
      ...parsed.data,
      last_updated: new Date().toISOString().split('T')[0],
    };

    // 只有在 mergedAliases 不为空时才设置 aliases
    if (mergedAliases.length > 0) {
      frontmatter.aliases = mergedAliases;
    }

    body = parsed.content.trim() + '\n\n' + content;
  } else {
    frontmatter = {
      canonical,
      entity_type: type,
      sources: sources.map(s => ({ file: s.file, lines: [s.line] })),
      status: needsReview ? 'draft' : 'canonical',
      last_updated: new Date().toISOString().split('T')[0],
    };

    if (aliases?.length) frontmatter.aliases = aliases;
    if (needsReview) frontmatter.needs_review = true;
    if (info && Object.keys(info).length > 0) frontmatter.info = info;

    body = generateNewPageBody(canonical, info, content, sources);
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, matter.stringify(body, frontmatter), 'utf-8');

  return { success: true, path: filePath, created: !isUpdate };
}

function generateNewPageBody(
  canonical: string,
  info: Record<string, string> | undefined,
  content: string,
  sources: { file: string; line: number }[]
): string {
  const lines: string[] = [];
  lines.push(`# ${canonical}`, '', content, '');

  if (info && Object.keys(info).length > 0) {
    lines.push('## 关键信息', '', '| 字段 | 值 |', '| --- | --- |');
    for (const [key, value] of Object.entries(info)) {
      lines.push(`| ${key} | ${value} |`);
    }
    lines.push('');
  }

  lines.push('## 来源', '');
  for (const source of sources) {
    const fileName = source.file.split('/').pop()?.replace('.md', '') || source.file;
    lines.push(`- [[${fileName}]] (line ${source.line})`);
  }
  lines.push('');

  return lines.join('\n');
}