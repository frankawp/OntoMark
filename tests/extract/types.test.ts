// tests/extract/types.test.ts
import { ExtractOptions, ExtractResult, EntityMention } from '../../src/extract/types';

describe('Extract Types', () => {
  it('should define EntityMention', () => {
    const mention: EntityMention = {
      name: 'FTX',
      aliases: [],
      type: 'Organization',
      context: ['FTX is a cryptocurrency exchange.'],
      confidence: 0.95,
    };

    expect(mention.name).toBe('FTX');
    expect(mention.confidence).toBe(0.95);
  });

  it('should define ExtractResult', () => {
    const result: ExtractResult = {
      rawPath: 'raw/tech/article.md',
      entities: [
        { name: 'FTX', aliases: [], type: 'Organization', context: ['...'], confidence: 0.9 },
      ],
      processed: true,
    };

    expect(result.entities).toHaveLength(1);
    expect(result.processed).toBe(true);
  });

  it('should define ExtractOptions', () => {
    const options: ExtractOptions = {
      force: true,
      dryRun: false,
    };

    expect(options.force).toBe(true);
    expect(options.dryRun).toBe(false);
  });

  it('should allow optional fields in EntityMention', () => {
    const mention: EntityMention = {
      name: 'Bitcoin',
      aliases: ['BTC'],
      type: 'Cryptocurrency',
      context: ['Bitcoin is the first cryptocurrency.'],
      confidence: 0.98,
      info: {
        symbol: 'BTC',
        launchYear: '2009',
      },
    };

    expect(mention.info).toBeDefined();
    expect(mention.info?.symbol).toBe('BTC');
  });
});
