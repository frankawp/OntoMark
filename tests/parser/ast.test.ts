// tests/parser/ast.test.ts
import { parseMarkdown, extractText, stringifyMarkdown } from '../../src/parser/ast';
import type { ParsedDocument } from '../../src/parser/types';

describe('parser/ast', () => {
  describe('parseMarkdown', () => {
    it('应该解析纯文本 Markdown', () => {
      const content = '# Hello\n\nThis is a test.';
      const result = parseMarkdown(content);

      expect(result.root).toBeDefined();
      expect(result.frontmatter).toBeNull();
      expect(result.links).toEqual([]);
      expect(result.text).toContain('Hello');
    });

    it('应该解析带 frontmatter 的 Markdown', () => {
      const content = `---
name: Test
type: Concept
---
# Hello`;
      const result = parseMarkdown(content);

      expect(result.frontmatter).toEqual({
        name: 'Test',
        type: 'Concept',
      });
    });

    it('应该正确解析复杂 Markdown 结构', () => {
      const content = `# Title

## Section 1

- Item 1
- Item 2

**Bold** and *italic* text.

[Link](https://example.com)`;
      const result = parseMarkdown(content);

      expect(result.root).toBeDefined();
      expect(result.text).toContain('Title');
      expect(result.text).toContain('Section 1');
      expect(result.text).toContain('Bold and italic');
    });
  });

  describe('extractText', () => {
    it('应该从 AST 提取纯文本', () => {
      const content = '# Title\n\nParagraph with **bold** text.';
      const doc = parseMarkdown(content);
      const text = extractText(doc.root);

      expect(text).toContain('Title');
      expect(text).toContain('Paragraph with bold text');
    });

    it('应该处理嵌套节点', () => {
      const content = `- List item 1
- List item 2 with **emphasis**`;
      const doc = parseMarkdown(content);
      const text = extractText(doc.root);

      expect(text).toContain('List item 1');
      expect(text).toContain('List item 2 with emphasis');
    });
  });

  describe('stringifyMarkdown', () => {
    it('应该将 AST 序列化为 Markdown', () => {
      const content = '# Title\n\nParagraph.';
      const doc = parseMarkdown(content);
      const markdown = stringifyMarkdown(doc.root);

      expect(markdown).toContain('Title');
      expect(markdown).toContain('Paragraph');
    });

    it('应该正确处理列表', () => {
      const content = '- Item 1\n- Item 2';
      const doc = parseMarkdown(content);
      const markdown = stringifyMarkdown(doc.root);

      expect(markdown).toContain('Item 1');
      expect(markdown).toContain('Item 2');
    });
  });
});