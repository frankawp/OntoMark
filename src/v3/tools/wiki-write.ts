import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { WikiWriteInput, WikiWriteResult, WikiWriteItemResult, WikiWriteEntity, SourceRef } from './types';
import { ontologyStatus } from './ontology-status';
import { normalizeEntityName, normalizeWikiLinksInText } from './normalize';

/**
 * 批量写入 wiki 页面（纯覆盖写入）
 *
 * Agent 负责在写入前读取现有内容并合并
 */
export async function wikiWrite(input: WikiWriteInput): Promise<WikiWriteResult> {
  const { projectPath, entities } = input;

  // 验证 ontology
  const ontology = await ontologyStatus(projectPath);
  if (!ontology.exists) {
    throw new Error('未找到 ontology.yaml，请先运行 ontomark init 创建项目结构');
  }

  const results: WikiWriteItemResult[] = [];
  let failed = 0;

  for (const entity of entities) {
    const result = await writeSingleEntity(projectPath, entity, ontology.entityTypes);
    results.push(result);

    if (!result.success) {
      failed++;
    }
  }

  const response: WikiWriteResult = {
    total: entities.length,
    failed,
    results,
  };

  // 如果有失败，添加可用的实体类型列表
  if (failed > 0) {
    response.availableEntityTypes = Object.keys(ontology.entityTypes);
  }

  return response;
}

/**
 * 写入单个实体（覆盖写入）
 */
async function writeSingleEntity(
  projectPath: string,
  entity: WikiWriteEntity,
  entityTypes: Record<string, any>
): Promise<WikiWriteItemResult> {
  const { canonical: rawCanonical, type, aliases: rawAliases, content: rawContent, sources, needsReview } = entity;

  // 规范化名称
  const canonical = normalizeEntityName(rawCanonical);
  const aliases = rawAliases?.map(a => normalizeEntityName(a));
  const content = normalizeWikiLinksInText(rawContent);

  // 验证实体类型
  if (!entityTypes[type]) {
    return {
      canonical,
      success: false,
      error: `未知实体类型: ${type}。可用类型: ${Object.keys(entityTypes).join(', ')}`,
    };
  }

  // 构建文件路径
  const sanitizedName = canonical
    .replace(/\s+/g, '_')
    .replace(/[^\w\-一-鿿À-ɏ]/g, '');
  const filePath = path.join(projectPath, 'wiki', type, `${sanitizedName}.md`);

  // 构建 frontmatter
  const frontmatter: Record<string, any> = {
    canonical,
    entity_type: type,
    sources: normalizeSources(sources),
    status: needsReview ? 'draft' : 'canonical',
    last_updated: new Date().toISOString().split('T')[0],
  };

  if (aliases?.length) frontmatter.aliases = aliases;
  if (needsReview) frontmatter.needs_review = true;

  const body = generatePageBody(canonical, content, sources);

  // 写入文件
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, matter.stringify(body, frontmatter), 'utf-8');

    return {
      canonical,
      success: true,
      path: filePath,
    };
  } catch (err) {
    return {
      canonical,
      success: false,
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
 * 生成页面内容
 */
function generatePageBody(
  canonical: string,
  content: string,
  sources: SourceRef[]
): string {
  const lines: string[] = [];
  lines.push(`# ${canonical}`, '', content, '');

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
