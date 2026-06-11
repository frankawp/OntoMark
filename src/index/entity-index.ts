import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { OntologySchema } from '../schema/types';
import { EntityIndex, EntityInfo, HeadingInfo, BlockInfo } from './types';
import { getFileNameWithoutExtension, normalizePath } from '../utils/path';
import { md5File } from '../utils/md5';

export class EntityIndexBuilder {
  private vaultPath: string;
  private schema: OntologySchema;

  constructor(vaultPath: string, schema: OntologySchema) {
    this.vaultPath = vaultPath;
    this.schema = schema;
  }

  async build(files: string[]): Promise<EntityIndex> {
    const entities = new Map<string, EntityInfo>();
    const aliasIndex = new Map<string, string[]>();
    const headingIndex = new Map<string, HeadingInfo[]>();
    const blockIndex = new Map<string, BlockInfo>();

    for (const file of files) {
      const entityInfo = await this.parseFile(file);
      entities.set(file, entityInfo);

      // Build alias index
      for (const alias of entityInfo.aliases) {
        const existing = aliasIndex.get(alias) || [];
        existing.push(file);
        aliasIndex.set(alias, existing);
      }

      // Build heading index
      for (const heading of entityInfo.headings) {
        const headingInfo: HeadingInfo = {
          filePath: file,
          heading,
          level: 1, // Simplified, actual level could be tracked
        };
        const existing = headingIndex.get(heading) || [];
        existing.push(headingInfo);
        headingIndex.set(heading, existing);
      }

      // Build block index
      for (const blockId of entityInfo.blocks) {
        blockIndex.set(blockId, {
          filePath: file,
          blockId,
        });
      }
    }

    return { entities, aliasIndex, headingIndex, blockIndex };
  }

  private async parseFile(filePath: string): Promise<EntityInfo> {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data, content: body } = matter(content);
    const fileName = getFileNameWithoutExtension(filePath);
    const fileHash = await md5File(filePath);

    // Extract entity type from tags
    const tags = Array.isArray(data.tags) ? data.tags : [];
    const entityType = this.extractEntityType(tags);

    // Extract aliases
    const aliases = Array.isArray(data.aliases) ? data.aliases : [];

    // Extract headings and blocks
    const { headings, blocks } = this.extractMarkdownElements(body);

    return {
      filePath: normalizePath(path.relative(this.vaultPath, filePath)),
      fileName,
      entityType,
      aliases,
      headings: [fileName, ...headings],
      blocks,
      fileHash,
    };
  }

  private extractEntityType(tags: string[]): string | undefined {
    const entityTypes = Object.keys(this.schema.entity_types);
    for (const tag of tags) {
      if (entityTypes.includes(tag)) {
        return tag;
      }
    }
    return undefined;
  }

  private extractMarkdownElements(content: string): { headings: string[]; blocks: string[] } {
    const headings: string[] = [];
    const blocks: string[] = [];

    // Extract headings
    const headingRegex = /^#+\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      headings.push(match[1].trim());
    }

    // Extract block references (^block-id)
    const blockRegex = /\^([a-zA-Z0-9_-]+)/g;
    while ((match = blockRegex.exec(content)) !== null) {
      blocks.push(match[1]);
    }

    return { headings, blocks };
  }
}
