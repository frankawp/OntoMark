import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { OntologySchema } from './schema/types';
import { SchemaLoader } from './schema/loader';
import { EntityExtractor } from './discovery/extractor';
import { EntityResolver } from './discovery/resolver';
import { ResolvedEntity } from './discovery/types';
import { WikiPageBuilder } from './builder/page-builder';
import { WikiIndexBuilder } from './builder/index-builder';
import { LinkBuilder } from './builder/link-builder';
import { BacklinkBuilder } from './builder/backlink-builder';
import { TopicBuilder } from './builder/topic-builder';
import { ContextBuilder } from './builder/context-builder';
import { LogBuilder } from './builder/log-builder';
import { AIProvider } from './llm/types';
import { EntityCache } from './storage/cache';
import { md5 } from './utils/md5';
import { OpenAIProvider } from './llm/openai-provider';

export interface OntoMarkOptions {
  rawPath: string;
  wikiPath: string;
  aiProvider: AIProvider;
  schemaPath?: string;
  projectPath?: string;
}

export interface BuildResult {
  extractSuccess: number;
  extractFailed: number;
  linkSuccess: number;
  linkFailed: number;
  wikiPages: number;
  reviewPages: number;
  linksAdded: number;
  topics: number;
}

export interface StatusResult {
  totalFiles: number;
  indexedFiles: number;
  pendingFiles: number;
  schemaHash: string;
  rawFiles: number;
  wikiFiles: number;
}

export interface LintResult {
  orphanPages: string[];
  missingLinks: { file: string; missing: string[] }[];
  emptyPages: string[];
  lowConfidence: string[];
  needsReview: string[];
  totalIssues: number;
}

export interface StatsResult {
  rawFiles: number;
  wikiPages: number;
  entitiesByType: Record<string, number>;
  totalLinks: number;
  avgLinksPerPage: number;
  orphans: number;
  lastBuild?: string;
}

export interface ContextResult {
  entity: string;
  entityType: string;
  aliases: string[];
  summary: string;
  relatedEntities: string[];
  sources: string[];
}

export class OntoMark {
  private readonly rawPath: string;
  private readonly wikiPath: string;
  private readonly projectPath: string;
  private readonly aiProvider: AIProvider;
  private readonly schemaPath?: string;
  private schema?: OntologySchema;

  constructor(options: OntoMarkOptions) {
    this.rawPath = path.resolve(options.rawPath);
    this.wikiPath = path.resolve(options.wikiPath);
    this.projectPath = path.resolve(options.projectPath || path.dirname(this.rawPath));
    this.aiProvider = options.aiProvider;
    this.schemaPath = options.schemaPath;
  }

  async extract(): Promise<BuildResult> {
    await this.ensureSchema();
    await this.ensureDirectories();

    const rawFiles = await this.scanMarkdown(this.rawPath);
    const extractor = new EntityExtractor(this.schema!, this.aiProvider);
    const mentions = [];
    let extractSuccess = 0;
    let extractFailed = 0;

    for (const rawFile of rawFiles) {
      try {
        const result = await extractor.extractFromFile(rawFile);
        mentions.push(...result.entities);
        extractSuccess++;
      } catch {
        extractFailed++;
      }
    }

    const resolver = new EntityResolver();
    const resolution = resolver.resolve(mentions);
    const entities = [...resolution.resolved, ...resolution.needsReview];
    const wikiPages = await this.writePages(entities);

    const indexBuilder = new WikiIndexBuilder(this.wikiPath);
    await indexBuilder.writeIndexFile();

    const reviewPages = entities.filter(entity => entity.needsReview).length;
    await new LogBuilder(this.wikiPath).append({
      action: 'extract',
      rawFiles: rawFiles.length,
      wikiPages,
      reviewPages,
      linksAdded: 0,
    });

    return {
      extractSuccess,
      extractFailed,
      linkSuccess: 0,
      linkFailed: 0,
      wikiPages,
      reviewPages,
      linksAdded: 0,
      topics: 0,
    };
  }

  async link(): Promise<BuildResult> {
    await this.ensureSchema();
    await this.ensureDirectories();

    const cache = await this.buildCacheFromWiki();
    const wikiFiles = (await this.scanMarkdown(this.wikiPath))
      .filter(file => !['index.md', 'log.md', 'AGENT_CONTEXT.md'].includes(path.basename(file)));
    const linkBuilder = new LinkBuilder(cache);
    const results = await linkBuilder.processAll(wikiFiles);
    const linksAdded = results.reduce((sum, result) => sum + result.linksAdded, 0);
    const linkSuccess = results.filter(result => result.linksAdded > 0).length;

    await new LogBuilder(this.wikiPath).append({
      action: 'link',
      rawFiles: 0,
      wikiPages: wikiFiles.length,
      reviewPages: 0,
      linksAdded,
    });

    return {
      extractSuccess: 0,
      extractFailed: 0,
      linkSuccess,
      linkFailed: 0,
      wikiPages: wikiFiles.length,
      reviewPages: 0,
      linksAdded,
      topics: 0,
    };
  }

  async build(): Promise<BuildResult> {
    await this.ensureSchema();
    await this.ensureDirectories();

    const rawFiles = await this.scanMarkdown(this.rawPath);
    const extractor = new EntityExtractor(this.schema!, this.aiProvider);
    const mentions = [];
    let extractSuccess = 0;
    let extractFailed = 0;

    for (const rawFile of rawFiles) {
      try {
        const result = await extractor.extractFromFile(rawFile);
        mentions.push(...result.entities);
        extractSuccess++;
      } catch {
        extractFailed++;
      }
    }

    const resolver = new EntityResolver();
    const resolution = resolver.resolve(mentions);
    const entities = [...resolution.resolved, ...resolution.needsReview];
    const wikiPages = await this.writePages(entities);
    const reviewPages = entities.filter(entity => entity.needsReview).length;

    let cache = await this.buildCacheFromEntities(entities);
    const linkResults = await new LinkBuilder(cache).processAll(await this.entityPagePaths(entities));
    const linksAdded = linkResults.reduce((sum, result) => sum + result.linksAdded, 0);
    const linkSuccess = linkResults.filter(result => result.linksAdded > 0).length;

    await new BacklinkBuilder(this.wikiPath).build(entities);
    const topics = await new TopicBuilder(this.wikiPath).build(entities);
    await new ContextBuilder(this.wikiPath).build(entities);
    await new WikiIndexBuilder(this.wikiPath).writeIndexFile();
    await new LogBuilder(this.wikiPath).append({
      action: 'build',
      rawFiles: rawFiles.length,
      wikiPages,
      reviewPages,
      linksAdded,
    });

    return {
      extractSuccess,
      extractFailed,
      linkSuccess,
      linkFailed: 0,
      wikiPages,
      reviewPages,
      linksAdded,
      topics,
    };
  }

  async getStatus(): Promise<StatusResult> {
    await this.ensureSchema();
    const rawFiles = await this.scanMarkdown(this.rawPath);
    const wikiFiles = await this.scanMarkdown(this.wikiPath);
    return {
      totalFiles: rawFiles.length,
      indexedFiles: wikiFiles.length,
      pendingFiles: 0,
      schemaHash: md5(JSON.stringify(this.schema)),
      rawFiles: rawFiles.length,
      wikiFiles: wikiFiles.length,
    };
  }

  /**
   * 健康检查 wiki
   * - 孤立页面（无入链）
   * - 缺失的链接
   * - 空页面
   * - 低置信度实体
   * - 需审核页面
   */
  async lint(): Promise<LintResult> {
    await this.ensureSchema();
    const wikiFiles = await this.scanMarkdown(this.wikiPath);
    const indexedFiles = new Set(
      wikiFiles
        .filter(f => !['index.md', 'log.md', 'AGENT_CONTEXT.md'].includes(path.basename(f)))
        .map(f => path.basename(f, '.md'))
    );

    const orphanPages: string[] = [];
    const missingLinks: { file: string; missing: string[] }[] = [];
    const emptyPages: string[] = [];
    const lowConfidence: string[] = [];
    const needsReview: string[] = [];
    const inboundLinks = new Map<string, Set<string>>();
    const allLinkedEntities = new Set<string>();

    for (const file of wikiFiles) {
      const basename = path.basename(file);
      if (['index.md', 'log.md', 'AGENT_CONTEXT.md'].includes(basename)) continue;

      const content = await fs.readFile(file, 'utf-8');
      const parsed = matter(content);
      const body = parsed.content;

      if (parsed.data.needs_review) {
        needsReview.push(path.basename(file, '.md'));
      }

      if (parsed.data.confidence && parsed.data.confidence < 0.5) {
        lowConfidence.push(path.basename(file, '.md'));
      }

      const lines = body.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'));
      if (lines.length < 3) {
        emptyPages.push(path.basename(file, '.md'));
      }

      const links = body.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g) || [];
      for (const link of links) {
        const entity = link.slice(2, -2).split('|')[0].trim();
        allLinkedEntities.add(entity);
        if (!inboundLinks.has(entity)) {
          inboundLinks.set(entity, new Set());
        }
        inboundLinks.get(entity)!.add(path.basename(file, '.md'));
      }
    }

    for (const page of indexedFiles) {
      if (!inboundLinks.has(page) || inboundLinks.get(page)!.size === 0) {
        if (!path.basename(page).startsWith('Topics/')) {
          orphanPages.push(page);
        }
      }
    }

    const referencedNotCreated: string[] = [];
    for (const entity of allLinkedEntities) {
      if (!indexedFiles.has(entity)) {
        referencedNotCreated.push(entity);
      }
    }

    if (referencedNotCreated.length > 0) {
      missingLinks.push({ file: 'global', missing: referencedNotCreated });
    }

    return {
      orphanPages,
      missingLinks,
      emptyPages,
      lowConfidence,
      needsReview,
      totalIssues: orphanPages.length + referencedNotCreated.length + emptyPages.length + lowConfidence.length + needsReview.length,
    };
  }

  /**
   * 统计知识库信息
   */
  async stats(): Promise<StatsResult> {
    await this.ensureSchema();
    const rawFiles = await this.scanMarkdown(this.rawPath);
    const wikiFiles = await this.scanMarkdown(this.wikiPath);
    const entityFiles = wikiFiles.filter(f => {
      const basename = path.basename(f);
      return !['index.md', 'log.md', 'AGENT_CONTEXT.md'].includes(basename);
    });

    const entitiesByType: Record<string, number> = {};
    let totalLinks = 0;

    for (const file of entityFiles) {
      const content = await fs.readFile(file, 'utf-8');
      const parsed = matter(content);
      const entityType = parsed.data.entity_type || 'Unknown';
      entitiesByType[entityType] = (entitiesByType[entityType] || 0) + 1;

      const links = content.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g) || [];
      totalLinks += links.length;
    }

    const avgLinksPerPage = entityFiles.length > 0 ? totalLinks / entityFiles.length : 0;
    const lintResult = await this.lint();

    let lastBuild: string | undefined;
    try {
      const logPath = path.join(this.wikiPath, 'log.md');
      const logContent = await fs.readFile(logPath, 'utf-8');
      const lastEntry = logContent.match(/## \[(\d{4}-\d{2}-\d{2})/);
      if (lastEntry) {
        lastBuild = lastEntry[1];
      }
    } catch {}

    return {
      rawFiles: rawFiles.length,
      wikiPages: entityFiles.length,
      entitiesByType,
      totalLinks,
      avgLinksPerPage: Math.round(avgLinksPerPage * 10) / 10,
      orphans: lintResult.orphanPages.length,
      lastBuild,
    };
  }

  /**
   * 为 Agent 提供上下文
   */
  async context(entityName: string): Promise<ContextResult | null> {
    await this.ensureSchema();
    const wikiFiles = await this.scanMarkdown(this.wikiPath);
    const targetFile = wikiFiles.find(f => {
      const basename = path.basename(f, '.md');
      return basename === entityName || basename.includes(entityName);
    });

    if (!targetFile) return null;

    const content = await fs.readFile(targetFile, 'utf-8');
    const parsed = matter(content);
    const body = parsed.content;

    const relatedEntities: string[] = [];
    const links = body.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g) || [];
    for (const link of links.slice(0, 10)) {
      relatedEntities.push(link.slice(2, -2).split('|')[0].trim());
    }

    const summary = body.split('\n').slice(0, 10).join('\n').replace(/<!-- ONTOMARK:BEGIN generated -->[\s\S]*?<!-- ONTOMARK:END generated -->/g, '').trim().slice(0, 500);

    return {
      entity: parsed.data.canonical || entityName,
      entityType: parsed.data.entity_type || 'Unknown',
      aliases: parsed.data.aliases || [],
      summary,
      relatedEntities: [...new Set(relatedEntities)].slice(0, 5),
      sources: (parsed.data.sources || []).map((s: any) => path.basename(s.file || s)),
    };
  }

  private async ensureSchema(): Promise<void> {
    if (this.schema) return;
    const loader = new SchemaLoader();
    const result = this.schemaPath
      ? await loader.load(this.schemaPath)
      : await loader.loadWithFallback(this.projectPath);
    this.schema = result.schema;
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.rawPath, { recursive: true });
    await fs.mkdir(this.wikiPath, { recursive: true });
  }

  private async writePages(entities: ResolvedEntity[]): Promise<number> {
    const builder = new WikiPageBuilder(this.schema!);
    let count = 0;

    for (const entity of entities) {
      const draft = builder.build(entity);
      const filePath = path.join(this.wikiPath, draft.filePath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const existing = await fs.readFile(filePath, 'utf-8').catch(() => undefined);
      const page = builder.build(entity, existing);
      await fs.writeFile(filePath, page.content, 'utf-8');
      count++;
    }

    return count;
  }

  private async entityPagePaths(entities: ResolvedEntity[]): Promise<string[]> {
    const builder = new WikiPageBuilder(this.schema!);
    return entities.map(entity => path.join(this.wikiPath, builder.build(entity).filePath));
  }

  private async buildCacheFromEntities(entities: ResolvedEntity[]): Promise<EntityCache> {
    const builder = new WikiPageBuilder(this.schema!);
    const cache: EntityCache = {
      entities: new Map(),
      aliases: new Map(),
      lastScan: new Date().toISOString(),
      schemaHash: md5(JSON.stringify(this.schema)),
    };

    for (const entity of entities) {
      const page = builder.build(entity);
      cache.entities.set(entity.canonicalName, {
        name: entity.canonicalName,
        entityType: entity.entityType,
        sources: entity.sources.map(source => ({ path: source.file, hash: '' })),
        wikiPagePath: page.filePath,
        hash: '',
      });
      for (const alias of entity.aliases) {
        cache.aliases.set(alias, entity.canonicalName);
      }
    }

    return cache;
  }

  private async buildCacheFromWiki(): Promise<EntityCache> {
    const files = await this.scanMarkdown(this.wikiPath);
    const cache: EntityCache = {
      entities: new Map(),
      aliases: new Map(),
      lastScan: new Date().toISOString(),
      schemaHash: md5(JSON.stringify(this.schema)),
    };

    for (const file of files) {
      const parsed = matter(await fs.readFile(file, 'utf-8'));
      if (!parsed.data.canonical || !parsed.data.entity_type) continue;
      const relative = path.relative(this.wikiPath, file);
      cache.entities.set(parsed.data.canonical, {
        name: parsed.data.canonical,
        entityType: parsed.data.entity_type,
        sources: parsed.data.sources || [],
        wikiPagePath: relative,
        hash: '',
      });
      for (const alias of parsed.data.aliases || []) {
        cache.aliases.set(alias, parsed.data.canonical);
      }
    }

    return cache;
  }

  private async scanMarkdown(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.scanMarkdown(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
    return files.sort();
  }
}

export * from './schema/types';
export * from './discovery/types';
export * from './builder/types';
export * from './llm/types';
export * from './utils/errors';
export { OpenAIProvider } from './llm/openai-provider';
