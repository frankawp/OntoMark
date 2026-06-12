// tests/parser/links.test.ts
import {
  extractWikiLinks,
  insertWikiLink,
  findAllLinkableText,
  insertAllWikiLinks
} from '../../src/parser/links';
import { parseMarkdown } from '../../src/parser/ast';

describe('parser/links', () => {
  describe('extractWikiLinks', () => {
    it('应该提取 [[WikiLink]] 格式的链接', () => {
      const content = 'This links to [[JWT]] and [[OAuth]].';
      const doc = parseMarkdown(content);
      const links = extractWikiLinks(doc.root);

      expect(links).toHaveLength(2);
      expect(links[0].target).toBe('JWT');
      expect(links[1].target).toBe('OAuth');
    });

    it('应该提取带显示文本的链接 [[target|text]]', () => {
      const content = 'See [[JWT|JSON Web Token]].';
      const doc = parseMarkdown(content);
      const links = extractWikiLinks(doc.root);

      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('JWT');
      expect(links[0].text).toBe('JSON Web Token');
    });

    it('应该正确处理多次调用', () => {
      const content1 = 'Link to [[JWT]] here.';
      const content2 = 'Link to [[OAuth]] there.';

      const doc1 = parseMarkdown(content1);
      const links1 = extractWikiLinks(doc1.root);
      expect(links1).toHaveLength(1);
      expect(links1[0].target).toBe('JWT');

      const doc2 = parseMarkdown(content2);
      const links2 = extractWikiLinks(doc2.root);
      expect(links2).toHaveLength(1);
      expect(links2[0].target).toBe('OAuth');
    });
  });

  describe('insertWikiLink', () => {
    it('应该在指定位置插入链接', () => {
      const content = 'This mentions JWT here.';
      const position = content.indexOf('JWT');
      const updated = insertWikiLink(content, position, position + 3, 'JWT');

      expect(updated).toBe('This mentions [[JWT]] here.');
    });

    it('不应该重复链接已有的链接', () => {
      const content = 'This has [[JWT]] already.';
      const position = content.indexOf('JWT');
      const updated = insertWikiLink(content, position, position + 3, 'JWT');

      expect(updated).toBe('This has [[JWT]] already.');
    });

    it('不应该插入包含链接语法的内容', () => {
      const content = '[[test is bad';
      // 选中的文本以 [[ 开头，应该跳过
      const updated = insertWikiLink(content, 0, 6, 'test');
      expect(updated).toBe('[[test is bad');
    });
  });

  describe('findAllLinkableText', () => {
    it('应该找到所有匹配实体名称的文本位置', () => {
      const content = 'JWT is used. JWT tokens are secure.';
      const entityNames = ['JWT', 'OAuth'];
      const positions = findAllLinkableText(content, entityNames);

      expect(positions).toHaveLength(2);
      expect(positions[0].text).toBe('JWT');
      expect(positions[1].text).toBe('JWT');
    });

    it('不应该匹配已在链接中的文本', () => {
      const content = '[[JWT]] is used. JWT tokens are secure.';
      const entityNames = ['JWT'];
      const positions = findAllLinkableText(content, entityNames);

      expect(positions).toHaveLength(1);
      expect(positions[0].start).toBeGreaterThan(10);
    });
  });

  describe('insertAllWikiLinks', () => {
    it('应该批量插入所有 WikiLinks', () => {
      const content = 'JWT and OAuth are both important.';
      const entityNames = ['JWT', 'OAuth'];
      const updated = insertAllWikiLinks(content, entityNames);

      expect(updated).toBe('[[JWT]] and [[OAuth]] are both important.');
    });
  });
});