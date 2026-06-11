// tests/parser/frontmatter.test.ts
import {
  parseFrontmatter,
  updateFrontmatter,
  validateFrontmatter,
} from '../../src/parser/frontmatter';

describe('parser/frontmatter', () => {
  describe('parseFrontmatter', () => {
    it('应该解析有效的 frontmatter', () => {
      const content = `---
name: JWT
type: Concept
aliases:
  - JSON Web Token
---
# JWT`;

      const result = parseFrontmatter(content);

      expect(result.data.name).toBe('JWT');
      expect(result.data.type).toBe('Concept');
      expect(result.data.aliases).toEqual(['JSON Web Token']);
    });

    it('应该处理没有 frontmatter 的内容', () => {
      const content = '# No frontmatter';
      const result = parseFrontmatter(content);

      expect(result.data).toEqual({});
    });

    it('应该返回去除 frontmatter 后的正文内容', () => {
      const content = `---
name: Test
---
# Title

Some content here.`;

      const result = parseFrontmatter(content);

      expect(result.content).toContain('# Title');
      expect(result.content).toContain('Some content here.');
      expect(result.content).not.toContain('---');
    });
  });

  describe('updateFrontmatter', () => {
    it('应该更新现有 frontmatter', () => {
      const content = `---
name: Old
---
# Title`;

      const updated = updateFrontmatter(content, { name: 'New', added: 'value' });

      expect(updated).toContain('name: New');
      expect(updated).toContain('added: value');
      expect(updated).toContain('# Title');
    });

    it('应该添加 frontmatter 到没有的内容', () => {
      const content = '# Title';
      const updated = updateFrontmatter(content, { name: 'New' });

      expect(updated).toContain('---');
      expect(updated).toContain('name: New');
      expect(updated).toContain('# Title');
    });

    it('应该保留原有的其他字段', () => {
      const content = `---
name: Test
type: Concept
---
# Title`;

      const updated = updateFrontmatter(content, { newField: 'newValue' });

      expect(updated).toContain('name: Test');
      expect(updated).toContain('type: Concept');
      expect(updated).toContain('newField: newValue');
    });

    it('应该处理数组类型的字段', () => {
      const content = `---
name: Test
---
# Title`;

      const updated = updateFrontmatter(content, {
        aliases: ['Alias1', 'Alias2'],
      });

      expect(updated).toContain('aliases:');
      expect(updated).toContain('- Alias1');
      expect(updated).toContain('- Alias2');
    });
  });

  describe('validateFrontmatter', () => {
    it('应该验证必需字段', () => {
      const valid = validateFrontmatter(
        { name: 'Test', type: 'Concept' },
        ['name', 'type']
      );
      expect(valid).toBe(true);
    });

    it('应该检测缺失字段', () => {
      const valid = validateFrontmatter({ name: 'Test' }, ['name', 'type']);
      expect(valid).toBe(false);
    });

    it('应该处理空数组（所有字段都存在）', () => {
      const valid = validateFrontmatter({ name: 'Test' }, []);
      expect(valid).toBe(true);
    });

    it('应该处理空数据对象', () => {
      const valid = validateFrontmatter({}, ['name']);
      expect(valid).toBe(false);
    });

    it('应该处理 null/undefined 值的字段', () => {
      const valid = validateFrontmatter(
        { name: 'Test', type: null },
        ['name', 'type']
      );
      expect(valid).toBe(false);
    });
  });
});