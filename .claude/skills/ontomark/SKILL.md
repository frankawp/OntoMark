---
name: ontomark
description: Use when building or querying an OntoMark wiki knowledge base. Triggers for ingesting new sources, answering questions about the wiki, or health-checking the knowledge graph. Make sure to use this skill whenever the user mentions knowledge base, wiki, ontology, entities, or wants to ingest/process/query documents, even if they don't explicitly ask for 'ontomark.'
---

# OntoMark Skill

> 将文档转化为持久化知识库。入口：`/ontomark`

## 安装

```bash
# 方式 1：全局安装（需要权限）
sudo npm link
ontomark --help

# 方式 2：使用快捷脚本（无需安装）
./ontomark --help

# 方式 3：npx 运行
npx . --help
```

## 意图识别

根据用户输入判断工作流：

| 关键词模式 | 工作流 | 子命令 |
|-----------|--------|--------|
| 处理/添加/导入/ingest | Ingest | `/ontomark ingest` |
| 谁/什么/查询/query | Query | `/ontomark query` |
| 检查/lint/健康/孤立 | Lint | `/ontomark lint` |

## 工作流

- **[Ingest](./ingest.md)** — 从 raw 文档提取实体，写入 wiki
- **[Query](./query.md)** — 查询 wiki 知识，生成回答
- **[Lint](./lint.md)** — 检查 wiki 健康状态，建议修复

## 强制规则

1. **先读后写** — 调用 `wiki-write` 前必须先读取或查询实体状态
2. **类型来源** — 所有实体类型从 `ontology-status` 获取，不硬编码
3. **来源追溯** — 每个实体必须记录 sources
4. **WikiLinks 由 LLM 标注** — CLI 不处理语义标注

## CLI 工具速查

调用方式：`ontomark <command> <project-path>` 或 `./ontomark <command> <project-path>`

| 命令 | 用途 |
|-----|------|
| `ontology-status` | 获取可用实体类型 |
| `raw-status` | 获取待处理文件 |
| `wiki-status` | 获取 wiki 文件状态 |
| `wiki-write` | 写入 wiki 页面 |
| `mark-processed` | 标记文件已处理 |
| `index-build` | 构建实体索引 |
| `index-query` | 查询实体是否存在 |
| `lint-all` | 检查 wiki 健康状态 |

示例：
```bash
ontomark ontology-status tests/markdown/multi_hop_vault
ontomark raw-status tests/markdown/multi_hop_vault
ontomark index-build tests/markdown/multi_hop_vault
ontomark lint-all tests/markdown/multi_hop_vault
```