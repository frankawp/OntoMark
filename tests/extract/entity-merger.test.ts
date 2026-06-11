// tests/extract/entity-merger.test.ts
import { EntityMerger } from '../../src/extract/entity-merger';
import { EntityMention } from '../../src/extract/types';

describe('EntityMerger', () => {
  it('should merge entities with same name', () => {
    const merger = new EntityMerger();

    const mentions: EntityMention[] = [
      {
        name: 'FTX',
        aliases: [],
        type: 'Organization',
        context: ['FTX is a crypto exchange.'],
        confidence: 0.9,
        sourcePath: 'raw/1.md',
      },
      {
        name: 'FTX',
        aliases: ['FTX Exchange'],
        type: 'Organization',
        context: ['FTX filed for bankruptcy.'],
        confidence: 0.95,
        sourcePath: 'raw/2.md',
      },
      {
        name: 'Sam Bankman-Fried',
        aliases: ['SBF'],
        type: 'Person',
        context: ['SBF founded FTX.'],
        confidence: 0.9,
        sourcePath: 'raw/1.md',
      },
    ];

    const merged = merger.merge(mentions);

    expect(merged.size).toBe(2);
    const ftx = merged.get('FTX')!;
    expect(ftx.aliases).toContain('FTX Exchange');
    expect(ftx.context).toHaveLength(2);
    expect(ftx.sources).toHaveLength(2);
  });

  it('should handle aliases for entity matching', () => {
    const merger = new EntityMerger();

    const mentions: EntityMention[] = [
      {
        name: 'Sam Bankman-Fried',
        aliases: ['SBF'],
        type: 'Person',
        context: ['SBF founded FTX.'],
        confidence: 0.9,
        sourcePath: 'raw/1.md',
      },
      {
        name: 'SBF',
        aliases: [],
        type: 'Person',
        context: ['SBF was arrested.'],
        confidence: 0.85,
        sourcePath: 'raw/2.md',
      },
    ];

    const merged = merger.merge(mentions);

    // SBF 应该被归并到 Sam Bankman-Fried
    expect(merged.size).toBe(1);
    expect(merged.has('Sam Bankman-Fried')).toBe(true);
  });
});