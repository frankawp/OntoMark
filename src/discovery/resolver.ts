// src/discovery/resolver.ts
import { EntityMention, EventMention, StatementMention, ResolvedEntity, ResolvedEvent, ResolvedStatement, ResolutionResult, Evidence } from './types';

/**
 * 实体消歧器（增强版）
 * 负责合并同名实体、事件、声明，检测冲突
 */
export class EntityResolver {
  private aliasToCanonical: Map<string, string> = new Map();
  private entityMap: Map<string, ResolvedEntity> = new Map();
  private eventMap: Map<string, ResolvedEvent> = new Map();
  private statementMap: Map<string, ResolvedStatement> = new Map();

  /**
   * 执行消歧
   */
  resolve(mentions: EntityMention[]): ResolutionResult {
    return this.resolveAll(mentions, [], []);
  }

  /**
   * 执行完整消歧（包含事件和声明）
   */
  resolveAll(
    entityMentions: EntityMention[],
    eventMentions: EventMention[],
    statementMentions: StatementMention[]
  ): ResolutionResult {
    this.aliasToCanonical.clear();
    this.entityMap.clear();
    this.eventMap.clear();
    this.statementMap.clear();

    const conflicts: Array<{ name: string; candidates: EntityMention[] }> = [];

    // 消歧实体
    for (const mention of entityMentions) {
      const canonicalName = this.findCanonicalName(mention);

      if (!canonicalName) {
        this.createEntity(mention);
      } else {
        const existing = this.entityMap.get(canonicalName)!;

        if (existing.entityType !== mention.entityType) {
          conflicts.push({ name: mention.name, candidates: [mention] });
          existing.needsReview = true;
          continue;
        }

        this.mergeEntity(existing, mention);
      }
    }

    // 消歧事件
    for (const event of eventMentions) {
      this.mergeEvent(event);
    }

    // 消歧声明
    for (const statement of statementMentions) {
      this.mergeStatement(statement);
    }

    // 分类结果
    const resolved: ResolvedEntity[] = [];
    const needsReview: ResolvedEntity[] = [];

    for (const entity of this.entityMap.values()) {
      if (entity.confidence < 0.6) {
        entity.needsReview = true;
      }

      if (entity.needsReview) {
        needsReview.push(entity);
      } else {
        resolved.push(entity);
      }
    }

    const events = Array.from(this.eventMap.values());
    const statements = Array.from(this.statementMap.values());

    return { resolved, needsReview, events, statements, conflicts };
  }

  private findCanonicalName(mention: EntityMention): string | undefined {
    const byName = this.aliasToCanonical.get(mention.name.toLowerCase());
    if (byName) return byName;

    for (const alias of mention.aliases) {
      const byAlias = this.aliasToCanonical.get(alias.toLowerCase());
      if (byAlias) return byAlias;
    }

    return undefined;
  }

  private createEntity(mention: EntityMention): void {
    const canonicalName = mention.name;

    const evidence: Evidence = {
      file: mention.location.file,
      line: mention.location.line,
      context: mention.context.join('\n'), // 合并所有上下文
      timestamp: new Date().toISOString(),
    };

    const entity: ResolvedEntity = {
      canonicalName,
      aliases: [...mention.aliases],
      entityType: mention.entityType,
      sources: [evidence],
      confidence: mention.confidence,
      needsReview: false,
      info: mention.info,
      relations: mention.relations,
    };

    this.entityMap.set(canonicalName, entity);
    this.aliasToCanonical.set(canonicalName.toLowerCase(), canonicalName);
    for (const alias of mention.aliases) {
      this.aliasToCanonical.set(alias.toLowerCase(), canonicalName);
    }
  }

  private mergeEntity(existing: ResolvedEntity, mention: EntityMention): void {
    // 合并别名
    for (const alias of mention.aliases) {
      if (!existing.aliases.includes(alias)) {
        existing.aliases.push(alias);
        this.aliasToCanonical.set(alias.toLowerCase(), existing.canonicalName);
      }
    }

    // 合并上下文
    const newContext = mention.context.join('\n');
    const evidence: Evidence = {
      file: mention.location.file,
      line: mention.location.line,
      context: newContext,
      timestamp: new Date().toISOString(),
    };
    existing.sources.push(evidence);

    // 合并 info
    if (mention.info) {
      existing.info = { ...existing.info, ...mention.info };
    }

    // 合并关系
    if (mention.relations) {
      existing.relations = [...(existing.relations || []), ...mention.relations];
    }

    existing.confidence = Math.max(existing.confidence, mention.confidence);
  }

  private mergeEvent(event: EventMention): void {
    const key = event.name.toLowerCase();

    if (this.eventMap.has(key)) {
      const existing = this.eventMap.get(key)!;

      // 合并描述
      existing.description += '\n\n' + event.description;

      // 合并参与者
      if (event.participants) {
        existing.participants = [...new Set([...(existing.participants || []), ...event.participants])];
      }

      // 添加证据
      existing.sources.push({
        file: event.locationInfo.file,
        line: event.locationInfo.line,
        context: event.context.join('\n'),
        timestamp: new Date().toISOString(),
      });
    } else {
      this.eventMap.set(key, {
        name: event.name,
        date: event.date,
        location: event.location,
        participants: event.participants,
        description: event.description,
        outcome: event.outcome,
        sources: [{
          file: event.locationInfo.file,
          line: event.locationInfo.line,
          context: event.context.join('\n'),
          timestamp: new Date().toISOString(),
        }],
        confidence: event.confidence,
        needsReview: false,
      });
    }
  }

  private mergeStatement(statement: StatementMention): void {
    // 使用发言人和摘要作为 key
    const key = `${statement.speaker}:${statement.summary.slice(0, 30)}`.toLowerCase();

    if (this.statementMap.has(key)) {
      const existing = this.statementMap.get(key)!;

      // 合并内容
      existing.content += '\n\n' + statement.content;

      existing.sources.push({
        file: statement.locationInfo.file,
        line: statement.locationInfo.line,
        context: statement.context,
        timestamp: new Date().toISOString(),
      });
    } else {
      this.statementMap.set(key, {
        summary: statement.summary,
        speaker: statement.speaker,
        speakerRole: statement.speakerRole,
        date: statement.date,
        content: statement.content,
        context: statement.context,
        sources: [{
          file: statement.locationInfo.file,
          line: statement.locationInfo.line,
          context: statement.context,
          timestamp: new Date().toISOString(),
        }],
        confidence: statement.confidence,
        needsReview: false,
      });
    }
  }
}