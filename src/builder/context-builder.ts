import * as fs from 'fs/promises';
import * as path from 'path';
import { ResolvedEntity } from '../discovery/types';

export class ContextBuilder {
  constructor(private readonly wikiPath: string) {}

  async build(entities: ResolvedEntity[]): Promise<void> {
    const lines = [
      '# Agent Context',
      '',
      '## Entry Points',
      '',
      '- [[index]]',
      ...entities
        .filter(entity => !entity.needsReview)
        .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
        .slice(0, 25)
        .map(entity => `- [[${entity.canonicalName}]] (${entity.entityType})`),
      '',
      '## Review Queue',
      '',
      ...entities
        .filter(entity => entity.needsReview)
        .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
        .map(entity => `- [[${entity.canonicalName}]]`),
      '',
    ];

    await fs.writeFile(path.join(this.wikiPath, 'AGENT_CONTEXT.md'), lines.join('\n'), 'utf-8');
  }
}
