import {
  PendingFilesResult,
  WikiStatusResult,
  WikiFileInfo,
  IndexQueryResult,
  LintOrphansResult,
  LintMissingResult,
  LintAllResult,
  MissingLink,
} from '../../../src/v3/tools/types';

describe('V3 Tool Types', () => {
  it('should define PendingFilesResult structure', () => {
    const result: PendingFilesResult = {
      files: [],
      total: 0,
      lastHash: '',
    };
    expect(result.total).toBe(0);
  });

  // ============ WikiStatusResult 和 WikiFileInfo 测试 ============

  it('should define WikiFileInfo structure', () => {
    const fileInfo: WikiFileInfo = {
      path: 'wiki/test-entity.md',
      canonical: 'Test Entity',
      type: 'Person',
      lastModified: '2026-06-13T00:00:00Z',
      humanEdited: true,
    };
    expect(fileInfo.canonical).toBe('Test Entity');
    expect(fileInfo.humanEdited).toBe(true);
  });

  it('should define WikiStatusResult structure', () => {
    const result: WikiStatusResult = {
      files: [
        {
          path: 'wiki/entity1.md',
          canonical: 'Entity 1',
          type: 'Person',
          lastModified: '2026-06-13T00:00:00Z',
          humanEdited: false,
        },
        {
          path: 'wiki/entity2.md',
          canonical: 'Entity 2',
          type: 'Organization',
          lastModified: '2026-06-12T00:00:00Z',
          humanEdited: true,
        },
      ],
      total: 2,
    };
    expect(result.files).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('should handle WikiStatusResult with empty files array', () => {
    const result: WikiStatusResult = {
      files: [],
      total: 0,
    };
    expect(result.files).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  // ============ IndexQueryResult 测试 ============

  it('should define IndexQueryResult when entity found', () => {
    const result: IndexQueryResult = {
      found: true,
      canonical: 'Test Entity',
      type: 'Person',
      path: 'wiki/test-entity.md',
      aliases: ['Alias 1', 'Alias 2'],
    };
    expect(result.found).toBe(true);
    expect(result.canonical).toBe('Test Entity');
    expect(result.aliases).toEqual(['Alias 1', 'Alias 2']);
  });

  it('should define IndexQueryResult when entity not found', () => {
    const result: IndexQueryResult = {
      found: false,
    };
    expect(result.found).toBe(false);
    expect(result.canonical).toBeUndefined();
    expect(result.type).toBeUndefined();
  });

  it('should handle IndexQueryResult without aliases', () => {
    const result: IndexQueryResult = {
      found: true,
      canonical: 'Test Entity',
      type: 'Person',
      path: 'wiki/test-entity.md',
    };
    expect(result.aliases).toBeUndefined();
  });

  // ============ LintOrphansResult 测试 ============

  it('should define LintOrphansResult structure', () => {
    const result: LintOrphansResult = {
      orphans: ['entity1', 'entity2', 'entity3'],
    };
    expect(result.orphans).toHaveLength(3);
    expect(result.orphans).toContain('entity1');
  });

  it('should handle LintOrphansResult with empty array', () => {
    const result: LintOrphansResult = {
      orphans: [],
    };
    expect(result.orphans).toHaveLength(0);
  });

  // ============ LintMissingResult 测试 ============

  it('should define LintMissingResult structure', () => {
    const missingLink: MissingLink = {
      entity: 'Missing Entity',
      referencedBy: ['entity1', 'entity2'],
    };
    const result: LintMissingResult = {
      missing: [missingLink],
    };
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].entity).toBe('Missing Entity');
  });

  it('should handle LintMissingResult with empty array', () => {
    const result: LintMissingResult = {
      missing: [],
    };
    expect(result.missing).toHaveLength(0);
  });

  // ============ LintAllResult 测试 ============

  it('should define LintAllResult structure', () => {
    const result: LintAllResult = {
      orphans: ['orphan1', 'orphan2'],
      missing: [
        { entity: 'missing1', referencedBy: ['ref1'] },
        { entity: 'missing2', referencedBy: ['ref2', 'ref3'] },
      ],
      empty: ['empty1', 'empty2', 'empty3'],
      totalIssues: 7,
    };
    expect(result.orphans).toHaveLength(2);
    expect(result.missing).toHaveLength(2);
    expect(result.empty).toHaveLength(3);
    expect(result.totalIssues).toBe(7);
  });

  it('should handle LintAllResult with empty arrays', () => {
    const result: LintAllResult = {
      orphans: [],
      missing: [],
      empty: [],
      totalIssues: 0,
    };
    expect(result.orphans).toHaveLength(0);
    expect(result.missing).toHaveLength(0);
    expect(result.empty).toHaveLength(0);
    expect(result.totalIssues).toBe(0);
  });

});