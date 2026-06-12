// src/discovery/resolver.ts
import { EntityMention, ResolvedEntity, ResolutionResult, Evidence } from './types';

/**
 * 实体消歧器
 * 负责合并同名实体、检测冲突、标记需要审核的实体
 */
export class EntityResolver {
  private aliasToCanonical: Map<string, string> = new Map();
  private entityMap: Map<string, ResolvedEntity> = new Map();

  /**
   * 执行实体消歧
   * @param mentions 待消歧的实体提及列表
   * @returns 消歧结果
   */
  resolve(mentions: EntityMention[]): ResolutionResult {
    this.aliasToCanonical.clear();
    this.entityMap.clear();

    const conflicts: Array<{ name: string; candidates: EntityMention[] }> = [];

    for (const mention of mentions) {
      const canonicalName = this.findCanonicalName(mention);

      if (!canonicalName) {
        this.createEntity(mention);
      } else {
        const existing = this.entityMap.get(canonicalName)!;

        // 同名不同类型 -> 标记冲突
        if (existing.entityType !== mention.entityType) {
          conflicts.push({ name: mention.name, candidates: [mention] });
          existing.needsReview = true;
          continue;
        }

        this.mergeEntity(existing, mention);
      }
    }

    const resolved: ResolvedEntity[] = [];
    const needsReview: ResolvedEntity[] = [];

    for (const entity of this.entityMap.values()) {
      // 低置信度 (< 0.6) -> 标记需要审核
      if (entity.confidence < 0.6) {
        entity.needsReview = true;
      }

      if (entity.needsReview) {
        needsReview.push(entity);
      } else {
        resolved.push(entity);
      }
    }

    return { resolved, needsReview, conflicts };
  }

  /**
   * 查找实体对应的标准名称
   */
  private findCanonicalName(mention: EntityMention): string | undefined {
    const byName = this.aliasToCanonical.get(mention.name.toLowerCase());
    if (byName) return byName;

    for (const alias of mention.aliases) {
      const byAlias = this.aliasToCanonical.get(alias.toLowerCase());
      if (byAlias) return byAlias;
    }

    return undefined;
  }

  /**
   * 创建新实体
   */
  private createEntity(mention: EntityMention): void {
    const canonicalName = mention.name;

    const evidence: Evidence = {
      file: mention.location.file,
      line: mention.location.line,
      context: mention.context,
      timestamp: new Date().toISOString(),
    };

    const entity: ResolvedEntity = {
      canonicalName,
      aliases: [...mention.aliases],
      entityType: mention.entityType,
      sources: [evidence],
      confidence: mention.confidence,
      needsReview: false,
    };

    this.entityMap.set(canonicalName, entity);
    this.aliasToCanonical.set(canonicalName.toLowerCase(), canonicalName);
    for (const alias of mention.aliases) {
      this.aliasToCanonical.set(alias.toLowerCase(), canonicalName);
    }
  }

  /**
   * 合并实体到已有实体
   */
  private mergeEntity(existing: ResolvedEntity, mention: EntityMention): void {
    // 合并别名
    for (const alias of mention.aliases) {
      if (!existing.aliases.includes(alias)) {
        existing.aliases.push(alias);
        this.aliasToCanonical.set(alias.toLowerCase(), existing.canonicalName);
      }
    }

    // 添加证据
    const evidence: Evidence = {
      file: mention.location.file,
      line: mention.location.line,
      context: mention.context,
      timestamp: new Date().toISOString(),
    };
    existing.sources.push(evidence);

    // 更新置信度（取最大值）
    existing.confidence = Math.max(existing.confidence, mention.confidence);
  }
}
