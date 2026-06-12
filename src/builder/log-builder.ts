import * as fs from 'fs/promises';
import * as path from 'path';

export interface BuildLogEntry {
  action: 'extract' | 'link' | 'build';
  rawFiles: number;
  wikiPages: number;
  reviewPages: number;
  linksAdded: number;
}

export class LogBuilder {
  constructor(private readonly wikiPath: string) {}

  async append(entry: BuildLogEntry): Promise<void> {
    const now = new Date().toISOString();
    const day = now.split('T')[0];
    const block = [
      `## [${day}] ${entry.action} | ${entry.rawFiles} raw files`,
      '',
      `- Wiki pages: ${entry.wikiPages}`,
      `- Review pages: ${entry.reviewPages}`,
      `- Links added: ${entry.linksAdded}`,
      `- Timestamp: ${now}`,
      '',
    ].join('\n');

    const logPath = path.join(this.wikiPath, 'log.md');
    let existing = '# Wiki Log\n\n';
    try {
      existing = await fs.readFile(logPath, 'utf-8');
      if (!existing.startsWith('# Wiki Log')) existing = `# Wiki Log\n\n${existing}`;
    } catch {
      // New log.
    }
    await fs.writeFile(logPath, `${existing.trim()}\n\n${block}`, 'utf-8');
  }
}
