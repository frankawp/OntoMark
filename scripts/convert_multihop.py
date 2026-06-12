#!/usr/bin/env python3
"""
将 MultiHop-RAG corpus.json 转换为 OntoMark raw 目录的 Markdown 文件

每个文档转换为一个 Markdown 文件：
- 文件名: {category}/{sanitized_title}.md
- Frontmatter: title, source, category, url, published_at, author
- 正文: body 字段内容
"""

import json
import os
import re
import sys
from pathlib import Path


def sanitize_filename(name: str) -> str:
    """将标题转换为安全的文件名"""
    # 移除或替换不安全字符
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    # 移除多余空格
    name = re.sub(r'\s+', '_', name)
    # 截断长度
    name = name[:100]
    return name.strip('_')


def convert_corpus_to_markdown(corpus_path: str, output_dir: str, limit: int = None):
    """
    将 corpus.json 转换为 Markdown 文件

    Args:
        corpus_path: corpus.json 文件路径
        output_dir: 输出目录 (raw/)
        limit: 限制转换的文档数量（用于测试）
    """
    # 读取 corpus
    with open(corpus_path, 'r', encoding='utf-8') as f:
        documents = json.load(f)

    if limit:
        documents = documents[:limit]
        print(f"限制转换前 {limit} 个文档")

    print(f"开始转换 {len(documents)} 个文档...")

    # 统计
    stats = {
        'total': 0,
        'success': 0,
        'skipped': 0,
        'categories': {}
    }

    for doc in documents:
        stats['total'] += 1

        # 提取字段
        title = doc.get('title', 'Untitled')
        source = doc.get('source', 'Unknown')
        category = doc.get('category', 'uncategorized')
        url = doc.get('url', '')
        published_at = doc.get('published_at', '')
        author = doc.get('author', '')
        body = doc.get('body', '')

        # 跳过空内容
        if not body or not title:
            stats['skipped'] += 1
            continue

        # 创建分类目录
        category_dir = Path(output_dir) / category
        category_dir.mkdir(parents=True, exist_ok=True)

        # 生成文件名
        filename = sanitize_filename(title) + '.md'
        filepath = category_dir / filename

        # 处理重名文件
        counter = 1
        while filepath.exists():
            filepath = category_dir / f"{sanitize_filename(title)}_{counter}.md"
            counter += 1

        # 构建 frontmatter
        frontmatter_lines = ['---']
        frontmatter_lines.append(f'title: "{title}"')
        frontmatter_lines.append(f'source: "{source}"')
        frontmatter_lines.append(f'category: "{category}"')
        if url:
            frontmatter_lines.append(f'url: "{url}"')
        if published_at:
            frontmatter_lines.append(f'published_at: "{published_at}"')
        if author:
            frontmatter_lines.append(f'author: "{author}"')
        frontmatter_lines.append('---')
        frontmatter_lines.append('')

        # 构建完整内容
        content = '\n'.join(frontmatter_lines) + '\n' + body

        # 写入文件
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        stats['success'] += 1
        stats['categories'][category] = stats['categories'].get(category, 0) + 1

        # 进度
        if stats['success'] % 100 == 0:
            print(f"  已转换 {stats['success']} 个文档...")

    print(f"\n转换完成!")
    print(f"  总计: {stats['total']}")
    print(f"  成功: {stats['success']}")
    print(f"  跳过: {stats['skipped']}")
    print(f"\n按分类统计:")
    for cat, count in sorted(stats['categories'].items()):
        print(f"  {cat}: {count}")


def main():
    # 默认路径
    script_dir = Path(__file__).parent.parent
    corpus_path = script_dir / 'tests' / 'markdown' / 'multi_hop' / 'dataset' / 'corpus.json'
    output_dir = script_dir / 'tests' / 'markdown' / 'multi_hop_vault' / 'raw'

    # 命令行参数
    if len(sys.argv) > 1:
        corpus_path = Path(sys.argv[1])
    if len(sys.argv) > 2:
        output_dir = Path(sys.argv[2])

    # 限制文档数量（可选）
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else None

    # 检查文件
    if not corpus_path.exists():
        print(f"错误: corpus.json 不存在: {corpus_path}")
        sys.exit(1)

    # 创建输出目录
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"输入: {corpus_path}")
    print(f"输出: {output_dir}")
    print()

    convert_corpus_to_markdown(str(corpus_path), str(output_dir), limit)


if __name__ == '__main__':
    main()
