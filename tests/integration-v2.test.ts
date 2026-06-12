import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { OntoMark } from '../src/index';
import { AIProvider } from '../src/llm/types';

describe('Integration: OntoMark V2 LLM Wiki pipeline', () => {
  const vaultPath = path.join(__dirname, 'fixtures/multihop_vault');
  const rawPath = path.join(vaultPath, 'raw');
  const wikiPath = path.join(vaultPath, 'wiki');

  const mockProvider: AIProvider = {
    extract: jest.fn().mockImplementation(async (text: string) => {
      const entities: any[] = [];

      if (text.includes('FTX')) {
        entities.push({
          name: 'FTX',
          aliases: [],
          type: 'Organization',
          context: ['FTX was a major cryptocurrency exchange'],
          confidence: 0.9,
        });
      }

      if (text.includes('Sam Bankman-Fried') || text.includes('SBF')) {
        entities.push({
          name: 'Sam Bankman-Fried',
          aliases: ['SBF'],
          type: 'Person',
          context: ['former CEO of FTX'],
          confidence: 0.95,
        });
      }

      if (text.includes('Caroline Ellison')) {
        entities.push({
          name: 'Caroline Ellison',
          aliases: [],
          type: 'Person',
          context: ['former CEO of Alameda Research'],
          confidence: 0.9,
        });
      }

      if (text.includes('Alameda Research')) {
        entities.push({
          name: 'Alameda Research',
          aliases: [],
          type: 'Organization',
          context: ['trading firm closely linked to FTX'],
          confidence: 0.9,
        });
      }

      if (text.includes('Security/JWT')) {
        entities.push({
          name: 'JWT',
          aliases: [],
          type: 'Concept',
          context: ['Security/JWT is ambiguous'],
          confidence: 0.4,
        });
      }

      return { entities };
    }),
    classify: jest.fn().mockResolvedValue({ type: 'Topic', confidence: 0.8 }),
    generate: jest.fn().mockResolvedValue('Generated summary'),
    isAvailable: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await fs.rm(wikiPath, { recursive: true, force: true });
    await fs.rm(path.join(vaultPath, '.ontomark'), { recursive: true, force: true });
    await fs.mkdir(wikiPath, { recursive: true });
  });

  it('builds typed canonical wiki pages with evidence and generated artifacts', async () => {
    const ontomark = new OntoMark({ rawPath, wikiPath, aiProvider: mockProvider });

    const result = await ontomark.build();

    expect(result.extractSuccess).toBe(2);
    expect(result.extractFailed).toBe(0);
    expect(result.wikiPages).toBeGreaterThanOrEqual(4);
    expect(result.linksAdded).toBeGreaterThan(0);

    const ftxPath = path.join(wikiPath, 'Organizations', 'FTX.md');
    const ftx = matter(await fs.readFile(ftxPath, 'utf-8'));
    expect(ftx.data.canonical).toBe('FTX');
    expect(ftx.data.entity_type).toBe('Organization');
    expect(ftx.data.status).toBe('canonical');
    expect(ftx.data.sources.map((s: any) => s.file).sort()).toEqual([
      path.join(rawPath, 'business/test2.md'),
      path.join(rawPath, 'technology/test1.md'),
    ].sort());

    const sbf = await fs.readFile(path.join(wikiPath, 'Persons', 'Sam_Bankman-Fried.md'), 'utf-8');
    expect(sbf).toContain('aliases:');
    expect(sbf).toContain('SBF');

    await expect(fs.access(path.join(wikiPath, 'index.md'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(wikiPath, 'log.md'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(wikiPath, 'Topics', 'Organization.md'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(wikiPath, 'AGENT_CONTEXT.md'))).resolves.toBeUndefined();

    const log = await fs.readFile(path.join(wikiPath, 'log.md'), 'utf-8');
    expect(log).toContain('## [');
    expect(log).toContain('build |');

    const context = await fs.readFile(path.join(wikiPath, 'AGENT_CONTEXT.md'), 'utf-8');
    expect(context).toContain('## Entry Points');
    expect(context).toContain('[[FTX]]');

    const backlinks = await fs.readFile(ftxPath, 'utf-8');
    expect(backlinks).toContain('## Referenced By');
  });

  it('preserves user-authored wiki content across rebuilds', async () => {
    const ontomark = new OntoMark({ rawPath, wikiPath, aiProvider: mockProvider });
    await ontomark.build();

    const ftxPath = path.join(wikiPath, 'Organizations', 'FTX.md');
    await fs.appendFile(ftxPath, '\n## Human Notes\n\nKeep this analyst note.\n', 'utf-8');

    await ontomark.build();

    const content = await fs.readFile(ftxPath, 'utf-8');
    expect(content).toContain('## Human Notes');
    expect(content).toContain('Keep this analyst note.');
  });

  it('writes low-confidence entities as reviewable draft pages', async () => {
    const extraRaw = path.join(rawPath, 'technology/ambiguous.md');
    await fs.writeFile(extraRaw, '# Ambiguous\n\nSecurity/JWT needs review.\n', 'utf-8');

    try {
      const ontomark = new OntoMark({ rawPath, wikiPath, aiProvider: mockProvider });
      await ontomark.build();

      const jwt = matter(await fs.readFile(path.join(wikiPath, 'Concepts', 'JWT.md'), 'utf-8'));
      expect(jwt.data.status).toBe('draft');
      expect(jwt.data.needs_review).toBe(true);
    } finally {
      await fs.rm(extraRaw, { force: true });
    }
  });
});
