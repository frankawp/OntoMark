// tests/sdk-v2.test.ts
// 测试 OntoMark V2 API (raw/wiki 架构)

import { OntoMark } from '../src/index';

describe('OntoMark V2 API', () => {
  const mockProvider = {
    recognize: jest.fn().mockResolvedValue({ entities: [] }),
    extract: jest.fn().mockResolvedValue({ entities: [] }),
  };

  it('should accept rawPath and wikiPath', () => {
    const ontomark = new OntoMark({
      rawPath: './raw',
      wikiPath: './wiki',
      llmProvider: mockProvider as any,
    });

    expect(ontomark).toBeDefined();
  });

  it('should have extract method', () => {
    const ontomark = new OntoMark({
      rawPath: './raw',
      wikiPath: './wiki',
      llmProvider: mockProvider as any,
    });

    expect(typeof ontomark.extract).toBe('function');
  });

  it('should have link method', () => {
    const ontomark = new OntoMark({
      rawPath: './raw',
      wikiPath: './wiki',
      llmProvider: mockProvider as any,
    });

    expect(typeof ontomark.link).toBe('function');
  });

  it('should have build method', () => {
    const ontomark = new OntoMark({
      rawPath: './raw',
      wikiPath: './wiki',
      llmProvider: mockProvider as any,
    });

    expect(typeof ontomark.build).toBe('function');
  });

  it('should support backward compatibility with vaultPath', () => {
    const ontomark = new OntoMark({
      vaultPath: './vault',
      llmProvider: mockProvider as any,
    } as any);

    expect(ontomark).toBeDefined();
  });
});
