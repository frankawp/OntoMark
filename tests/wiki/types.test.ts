// tests/wiki/types.test.ts
import { WikiPage, WikiIndexEntity, WikiIndex } from '../../src/wiki/types';

describe('Wiki Types', () => {
  it('should create WikiPage with frontmatter', () => {
    const page: WikiPage = {
      name: 'Sam Bankman-Fried',
      aliases: ['SBF', 'Bankman-Fried'],
      type: 'Person',
      sources: ['raw/tech/article1.md', 'raw/tech/article2.md'],
      summary: 'FTX 创始人',
      info: { '职业/身份': '企业家' },
      content: '## 简介\n\nFTX 创始人...',
      updatedAt: '2026-06-11',
    };

    expect(page.name).toBe('Sam Bankman-Fried');
    expect(page.aliases).toContain('SBF');
  });

  it('should create WikiIndex entry', () => {
    const index: WikiIndex = {
      updatedAt: '2026-06-11',
      entities: {
        Person: [
          { name: 'Sam Bankman-Fried', summary: 'FTX 创始人' },
        ],
        Organization: [
          { name: 'FTX', summary: '加密货币交易所' },
        ],
      },
    };

    expect(index.entities.Person).toHaveLength(1);
  });
});
