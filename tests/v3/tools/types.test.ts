import {
  RawStatusResult,
  WikiStatusResult,
  OntologyStatusResult,
  WikiWriteInput,
  IndexQueryResult,
  LintOrphansResult,
  LintMissingResult,
  LintAllResult,
  ProcessedFile,
} from '../../../src/v3/tools/types';

describe('V3 Tool Types', () => {
  it('should define ProcessedFile structure', () => {
    const file: ProcessedFile = {
      path: 'raw/test.md',
      lastProcessed: '2026-06-13T00:00:00Z',
      hash: 'abc123',
      modified: false,
    };
    expect(file.path).toBe('raw/test.md');
  });

  it('should define RawStatusResult structure', () => {
    const result: RawStatusResult = {
      files: [],
      total: 0,
      pending: 0,
    };
    expect(result.total).toBe(0);
  });

  it('should define WikiWriteInput structure', () => {
    const input: WikiWriteInput = {
      projectPath: '/project',
      canonical: 'Test Entity',
      type: 'Person',
      content: 'Test content',
      sources: [{ file: 'raw/test.md', line: 1 }],
      isUpdate: false,
    };
    expect(input.canonical).toBe('Test Entity');
  });
});