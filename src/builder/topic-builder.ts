import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { ResolvedEntity } from '../discovery/types';

export class TopicBuilder {
  constructor(private readonly wikiPath: string) {}

  async build(entities: ResolvedEntity[]): Promise<number> {
    const byType = new Map<string, ResolvedEntity[]>();
    for (const entity of entities) {
      if (!byType.has(entity.entityType)) byType.set(entity.entityType, []);
      byType.get(entity.entityType)!.push(entity);
    }

    const topicsDir = path.join(this.wikiPath, 'Topics');
    await fs.mkdir(topicsDir, { recursive: true });

    let count = 0;
    for (const [type, typedEntities] of byType) {
      const content = matter.stringify([
        `# ${type}`,
        '',
        '<!-- ONTOMARK:BEGIN generated -->',
        '',
        '## Overview',
        '',
        `${type} knowledge map generated from canonical wiki pages.`,
        '',
        `## ${type}s`,
        '',
        ...typedEntities
          .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
          .map(entity => `- [[${entity.canonicalName}]]`),
        '',
        '## Related Topics',
        '',
        ...Array.from(byType.keys())
          .filter(other => other !== type)
          .sort()
          .map(other => `- [[${other}]]`),
        '',
        '<!-- ONTOMARK:END generated -->',
        '',
      ].join('\n'), {
        canonical: type,
        entity_type: 'Topic',
        status: 'canonical',
        sources: [],
        last_updated: new Date().toISOString().split('T')[0],
      });
      await fs.writeFile(path.join(topicsDir, `${type}.md`), content, 'utf-8');
      count++;
    }

    return count;
  }
}
