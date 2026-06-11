import { EntityMention } from './types';
import { WikiPage } from '../wiki/types';

/**
 * 合并后的实体信息
 */
export interface MergedEntity {
  name: string;
  aliases: Set<string>;
  type: string;
  context: string[];
  sources: string[];
  info: Record<string, string>;
  confidence: number;
}

export class EntityMerger {
  private aliasToCanonical: Map<string, string> = new Map();

  /**
   * 合并同一实体的多源信息
   */
  merge(mentions: EntityMention[]): Map<string, MergedEntity> {
    const entityMap = new Map<string, MergedEntity>();

    for (const mention of mentions) {
      // 查找是否已存在（通过 canonical name 或 alias）
      let canonicalName = this.findCanonicalName(mention.name, mention.aliases);

      if (!canonicalName) {
        // 新实体
        canonicalName = mention.name;
        entityMap.set(canonicalName, {
          name: canonicalName,
          aliases: new Set(mention.aliases),
          type: mention.type,
          context: [...mention.context],
          sources: [mention.sourcePath || ''],
          info: mention.info || {},
          confidence: mention.confidence,
        });

        // 注册别名
        this.aliasToCanonical.set(canonicalName.toLowerCase(), canonicalName);
        for (const alias of mention.aliases) {
          this.aliasToCanonical.set(alias.toLowerCase(), canonicalName);
        }
      } else {
        // 合并到已有实体
        const existing = entityMap.get(canonicalName)!;

        // 合并别名
        for (const alias of mention.aliases) {
          existing.aliases.add(alias);
          this.aliasToCanonical.set(alias.toLowerCase(), canonicalName);
        }

        // 合并上下文
        existing.context.push(...mention.context);

        // 合并来源
        if (!existing.sources.includes(mention.sourcePath || '')) {
          existing.sources.push(mention.sourcePath || '');
        }

        // 合并信息
        existing.info = { ...existing.info, ...mention.info };

        // 更新置信度（取最大值）
        existing.confidence = Math.max(existing.confidence, mention.confidence);
      }
    }

    return entityMap;
  }

  /**
   * 查找 canonical name
   */
  private findCanonicalName(name: string, aliases: string[]): string | undefined {
    // 先检查 name
    const canonical = this.aliasToCanonical.get(name.toLowerCase());
    if (canonical) return canonical;

    // 再检查 aliases
    for (const alias of aliases) {
      const found = this.aliasToCanonical.get(alias.toLowerCase());
      if (found) return found;
    }

    return undefined;
  }

  /**
   * 将 MergedEntity 转换为 WikiPage
   */
  toWikiPage(merged: MergedEntity): WikiPage {
    return {
      name: merged.name,
      aliases: Array.from(merged.aliases),
      type: merged.type,
      sources: merged.sources,
      summary: '', // 由 LLM 生成
      info: merged.info,
      content: '', // 由 WikiPageBuilder 生成
      updatedAt: new Date().toISOString().split('T')[0],
    };
  }
}
