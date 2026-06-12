// tests/builder/types.test.ts
import { BuiltPage, LinkResult, WikiFrontmatter, PageBuildOptions } from '../../src/builder/types';

describe('builder/types', () => {
  describe('WikiFrontmatter', () => {
    it('应该正确定义 V2 格式的 frontmatter', () => {
      const frontmatter: WikiFrontmatter = {
        canonical: 'JWT',
        entity_type: 'Concept',
        aliases: ['JSON Web Token'],
        sources: [
          { file: 'source/auth.md', lines: [10, 20] }
        ],
        status: 'canonical',
      };

      expect(frontmatter.canonical).toBe('JWT');
      expect(frontmatter.entity_type).toBe('Concept');
      expect(frontmatter.aliases).toContain('JSON Web Token');
      expect(frontmatter.status).toBe('canonical');
    });

    it('应该支持可选字段', () => {
      const frontmatter: WikiFrontmatter = {
        canonical: 'OAuth',
        entity_type: 'Protocol',
        sources: [],
        status: 'draft',
        needs_review: true,
        last_updated: '2024-01-01',
      };

      expect(frontmatter.needs_review).toBe(true);
      expect(frontmatter.last_updated).toBe('2024-01-01');
    });
  });

  describe('BuiltPage', () => {
    it('应该正确定义构建后的页面', () => {
      const page: BuiltPage = {
        name: 'JWT',
        entityType: 'Concept',
        filePath: 'wiki/Concepts/JWT.md',
        frontmatter: {
          canonical: 'JWT',
          entity_type: 'Concept',
          aliases: ['JSON Web Token'],
          sources: [],
          status: 'canonical',
        },
        content: '# JWT\n\nContent here.',
      };

      expect(page.name).toBe('JWT');
      expect(page.entityType).toBe('Concept');
      expect(page.filePath).toBe('wiki/Concepts/JWT.md');
      expect(page.content).toContain('JWT');
    });
  });

  describe('LinkResult', () => {
    it('应该正确定义链接结果', () => {
      const result: LinkResult = {
        filePath: 'wiki/Concepts/JWT.md',
        linksAdded: 3,
        linksSkipped: 1,
      };

      expect(result.filePath).toBe('wiki/Concepts/JWT.md');
      expect(result.linksAdded).toBe(3);
      expect(result.linksSkipped).toBe(1);
    });
  });

  describe('PageBuildOptions', () => {
    it('应该正确定义页面构建选项', () => {
      const options: PageBuildOptions = {
        includeSources: true,
        generateRelated: false,
      };

      expect(options.includeSources).toBe(true);
      expect(options.generateRelated).toBe(false);
    });

    it('应该支持部分选项', () => {
      const options: PageBuildOptions = {
        includeSources: true,
      };

      expect(options.includeSources).toBe(true);
      expect(options.generateRelated).toBeUndefined();
    });
  });
});
