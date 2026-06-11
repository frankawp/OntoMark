// tests/parser/types.test.ts
import { WikiLink, MarkdownNode } from '../../src/parser/types';

describe('parser/types', () => {
  describe('WikiLink', () => {
    it('应该正确定义 WikiLink 类型', () => {
      const link: WikiLink = {
        target: 'JWT',
        text: 'JWT',
        position: { start: 10, end: 16 },
      };
      expect(link.target).toBe('JWT');
      expect(link.text).toBe('JWT');
      expect(link.position.start).toBe(10);
    });
  });

  describe('MarkdownNode', () => {
    it('应该正确定义 MarkdownNode 类型', () => {
      const node: MarkdownNode = {
        type: 'text',
        value: 'Hello',
      };
      expect(node.type).toBe('text');
      expect(node.value).toBe('Hello');
    });
  });
});
