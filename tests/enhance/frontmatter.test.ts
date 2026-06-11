import { FrontmatterHandler } from '../../src/enhance/frontmatter';

describe('FrontmatterHandler', () => {
  describe('parse', () => {
    it('should parse frontmatter and body', () => {
      const content = `---
title: Test
tags: [Security]
---
# Content

Body text.`;

      const handler = new FrontmatterHandler();
      const result = handler.parse(content);

      expect(result.frontmatter.title).toBe('Test');
      expect(result.frontmatter.tags).toEqual(['Security']);
      expect(result.body.trim()).toBe('# Content\n\nBody text.');
    });

    it('should handle file without frontmatter', () => {
      const content = '# No Frontmatter\n\nJust content.';
      const handler = new FrontmatterHandler();
      const result = handler.parse(content);

      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content);
    });
  });

  describe('enhance', () => {
    it('should add entity type to tags', () => {
      const handler = new FrontmatterHandler();
      const frontmatter = { title: 'Test' };

      const result = handler.enhance(frontmatter, 'Concept');

      expect(result.tags).toContain('Concept');
    });

    it('should append entity type to existing tags array', () => {
      const handler = new FrontmatterHandler();
      const frontmatter = { tags: ['Security'] };

      const result = handler.enhance(frontmatter, 'Concept');

      expect(result.tags).toEqual(['Security', 'Concept']);
    });

    it('should not duplicate existing entity type tag', () => {
      const handler = new FrontmatterHandler();
      const frontmatter = { tags: ['Concept'] };

      const result = handler.enhance(frontmatter, 'Concept');

      expect(result.tags).toEqual(['Concept']);
    });

    it('should convert single string tag to array', () => {
      const handler = new FrontmatterHandler();
      const frontmatter = { tags: 'Security' };

      const result = handler.enhance(frontmatter, 'Concept');

      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.tags).toContain('Security');
      expect(result.tags).toContain('Concept');
    });

    it('should preserve other frontmatter fields', () => {
      const handler = new FrontmatterHandler();
      const frontmatter = { title: 'Test', author: 'John', custom: 123 };

      const result = handler.enhance(frontmatter, 'Concept');

      expect(result.title).toBe('Test');
      expect(result.author).toBe('John');
      expect(result.custom).toBe(123);
    });
  });

  describe('stringify', () => {
    it('should stringify frontmatter and body', () => {
      const handler = new FrontmatterHandler();
      const frontmatter = { title: 'Test', tags: ['Concept'] };
      const body = '# Content\n\nBody text.';

      const result = handler.stringify(frontmatter, body);

      expect(result).toContain('---');
      expect(result).toContain('title: Test');
      expect(result).toContain('- Concept');
      expect(result).toContain('# Content');
    });
  });
});
