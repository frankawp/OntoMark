import { MatchResult } from './types';

interface EntityWithLink {
  text: string;
  start: number;
  end: number;
  link: string;
}

export class EntityLinker {
  generateWikiLink(match: MatchResult): string {
    if (!match.target) {
      return match.text;
    }

    switch (match.type) {
      case 'document':
        return `[[${match.target.fileName}]]`;

      case 'alias':
        return `[[${match.target.fileName}|${match.original}]]`;

      case 'heading':
        return `[[${match.target.filePath}#${match.target.heading}]]`;

      case 'block':
        return `[[${match.target.filePath}#^${match.target.blockId}]]`;

      default:
        return match.text;
    }
  }

  insertLinks(content: string, entities: EntityWithLink[]): string {
    // Sort by start position descending to replace from end to start
    const sorted = [...entities].sort((a, b) => b.start - a.start);

    let result = content;
    for (const entity of sorted) {
      result =
        result.slice(0, entity.start) +
        entity.link +
        result.slice(entity.end);
    }

    return result;
  }
}