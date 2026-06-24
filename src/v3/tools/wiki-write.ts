import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { WikiWriteInput, WikiWriteResult, WikiWriteItemResult, WikiWriteEntity, SourceRef } from './types';
import { ontologyStatus } from './ontology-status';
import { readConfig } from './read-config';
import { normalizeEntityName, normalizeWikiLinksInText } from './normalize';

/**
 * 批量写入 wiki 页面
 *
 * 每个实体独立决定是新建还是更新：
 * - isUpdate=true 且文件存在 → 更新
 * - isUpdate=false 且文件不存在 → 新建
 * - isUpdate=true 且文件不存在 → 报错
 * - isUpdate=false 且文件存在 → 报错
 */
export async function wikiWrite(input: WikiWriteInput): Promise<WikiWriteResult> {
  const { projectPath, entities } = input;

  // 验证 ontology
  const ontology = await ontologyStatus(projectPath);
  if (!ontology.exists) {
    throw new Error('未找到 ontology.yaml，请先运行 ontomark init 创建项目结构');
  }

  // 读取配置获取输出目录
  const config = await readConfig(projectPath);
  const outputDir = config.outputDir;

  const results: WikiWriteItemResult[] = [];
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const entity of entities) {
    const result = await writeSingleEntity(projectPath, outputDir, entity, ontology.entityTypes);
    results.push(result);

    if (!result.success) {
      failed++;
    } else if (result.action === 'created') {
      created++;
    } else if (result.action === 'updated') {
      updated++;
    }
  }

  return {
    total: entities.length,
    created,
    updated,
    failed,
    results,
  };
}

/**
 * 写入单个实体
 */
async function writeSingleEntity(
  projectPath: string,
  outputDir: string,
  entity: WikiWriteEntity,
  entityTypes: Record<string, any>
): Promise<WikiWriteItemResult> {
  const { canonical: rawCanonical, type, aliases: rawAliases, info, content: rawContent, sources, needsReview, isUpdate } = entity;

  // 规范化名称
  const canonical = normalizeEntityName(rawCanonical);
  const aliases = rawAliases?.map(a => normalizeEntityName(a));
  const content = normalizeWikiLinksInText(rawContent);

  // 验证实体类型
  if (!entityTypes[type]) {
    return {
      canonical,
      success: false,
      action: 'created',
      error: `未知实体类型: ${type}。可用类型: ${Object.keys(entityTypes).join(', ')}`,
    };
  }

  // 构建文件路径（直接使用 type，不加 s）
  const sanitizedName = canonical
    .replace(/\s+/g, '_')
    // 保留 字母数字、下划线、连字符、CJK、拉丁扩展字符
    .replace(/[^\w\-一-鿿À-ɏ]/g, '');
  const filePath = path.join(projectPath, outputDir, type, `${sanitizedName}.md`);

  // 检查文件存在状态
  const exists = await fs.access(filePath).then(() => true).catch(() => false);

  if (isUpdate && !exists) {
    return {
      canonical,
      success: false,
      action: 'updated',
      error: `无法更新：文件不存在: ${filePath}。提示：使用 isUpdate=false 来新建实体`,
    };
  }
  if (!isUpdate && exists) {
    return {
      canonical,
      success: false,
      action: 'created',
      error: `无法创建：文件已存在: ${filePath}。提示：使用 isUpdate=true 来更新现有实体`,
    };
  }

  let frontmatter: Record<string, any>;
  let body: string;

  if (isUpdate && exists) {
    // 更新现有实体
    try {
      const existing = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(existing);

      // 合并别名
      const existingAliases: string[] = parsed.data.aliases || [];
      const mergedAliases = [...new Set([...existingAliases, ...(aliases || [])])];

      // 合并来源
      const existingSources = parsed.data.sources || [];
      const newSources = normalizeSources(sources);
      const mergedSources = mergeSources(existingSources, newSources);

      frontmatter = {
        ...parsed.data,
        sources: mergedSources,
        last_updated: new Date().toISOString().split('T')[0],
      };

      if (mergedAliases.length > 0) {
        frontmatter.aliases = mergedAliases;
      }

      // 合并 info（新信息覆盖旧信息）
      if (info && Object.keys(info).length > 0) {
        frontmatter.info = { ...parsed.data.info, ...info };
      }

      // 追加内容
      body = parsed.content.trim() + '\n\n' + content;
    } catch (err) {
      return {
        canonical,
        success: false,
        action: 'updated',
        error: `读取现有文件失败: ${err}`,
      };
    }
  } else {
    // 新建实体
    frontmatter = {
      canonical,
      entity_type: type,
      sources: normalizeSources(sources),
      status: needsReview ? 'draft' : 'canonical',
      last_updated: new Date().toISOString().split('T')[0],
    };

    if (aliases?.length) frontmatter.aliases = aliases;
    if (needsReview) frontmatter.needs_review = true;
    if (info && Object.keys(info).length > 0) frontmatter.info = info;

    body = generateNewPageBody(canonical, info, content, sources);
  }

  // 写入文件
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, matter.stringify(body, frontmatter), 'utf-8');

    return {
      canonical,
      success: true,
      path: filePath,
      action: isUpdate ? 'updated' : 'created',
    };
  } catch (err) {
    return {
      canonical,
      success: false,
      action: isUpdate ? 'updated' : 'created',
      error: `写入文件失败: ${err}`,
    };
  }
}

/**
 * 规范化来源格式
 */
function normalizeSources(sources: SourceRef[]): Array<{ file: string; lines?: number[] }> {
  return sources.map(s => {
    if (typeof s === 'string') {
      return { file: s };
    }
    return s;
  });
}

/**
 * 合并来源（去重）
 */
function mergeSources(
  existing: Array<{ file: string; lines?: number[] }>,
  newSources: Array<{ file: string; lines?: number[] }>
): Array<{ file: string; lines?: number[] }> {
  const sourceMap = new Map<string, Set<number>>();

  // 添加现有来源
  for (const s of existing) {
    if (!sourceMap.has(s.file)) {
      sourceMap.set(s.file, new Set());
    }
    if (s.lines) {
      for (const line of s.lines) {
        sourceMap.get(s.file)!.add(line);
      }
    }
  }

  // 添加新来源
  for (const s of newSources) {
    if (!sourceMap.has(s.file)) {
      sourceMap.set(s.file, new Set());
    }
    if (s.lines) {
      for (const line of s.lines) {
        sourceMap.get(s.file)!.add(line);
      }
    }
  }

  // 转换回数组（lines 为空时不包含该字段）
  return Array.from(sourceMap.entries()).map(([file, lines]) => {
    const result: { file: string; lines?: number[] } = { file };
    if (lines.size > 0) {
      result.lines = Array.from(lines).sort((a, b) => a - b);
    }
    return result;
  });
}

/**
 * 生成新页面内容
 */
function generateNewPageBody(
  canonical: string,
  info: Record<string, string> | undefined,
  content: string,
  sources: SourceRef[]
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
    const fileStr = typeof source === 'string' ? source : source.file;
    const linesStr = typeof source === 'object' && source.lines ? ` (lines ${source.lines.join(', ')})` : '';
    const fileName = fileStr.split('/').pop()?.replace('.md', '') || fileStr;
    lines.push(`- [[${fileName}]]${linesStr}`);
  }
  lines.push('');

  return lines.join('\n');
}
