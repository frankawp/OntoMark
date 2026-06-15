---
name: ontomark
description: Use when building or querying an OntoMark wiki knowledge base. Triggers for ingesting new sources, answering questions about the wiki, or health-checking the knowledge graph. Make sure to use this skill whenever the user mentions knowledge base, wiki, ontology, entities, or wants to ingest/process/query documents, even if they don't explicitly ask for 'ontomark.'
---

# OntoMark Skill



## 目标

> 将文档转化为持久化知识库。

wiki 目录下提供的内容应该是经过处理的知识库条目，条目内容中提及的实体必须被显示标注并与知识库中的对应实体链接起来。wiki目录中的内容必须是人类可读可编辑的。

你将与人类一起维护这个知识库，确保它随着新文档的添加而不断丰富和完善。因此，你需要在处理新文档时考虑与现有知识库的关系，避免重复创建实体，并保持知识库的一致性和准确性。存在歧义时，优先考虑用户的输入和文档内容，必要时可以向用户提问以获取更多信息。


## 项目结构

如果初始结构不存在，技能应该调用 `ontomark init` 来创建必要的目录和文件。

```
  project-root/
  ├── raw/                        # 原始文档目录（用户管理）
  │   ├── meetings/
  │   │   └── 2024-01-15.md
  │   ├── docs/
  │   │   └── product-spec.md
  │   └── notes/
  │       └── idea.md
  │
  ├── wiki/                       # 知识库目录（CLI 管理）
  │   ├── Person/
  │   │   ├── 张三.md
  │   │   └── 李四.md
  │   ├── Organization/
  │   │   └── Acme公司.md
  │   ├── Project/
  │   │   └── Alpha项目.md
  │   └── Concept/
  │       └── 微服务架构.md
  │
  ├── .ontomark/                  # CLI 内部状态（用户无需关心）
  │   ├── index.json              # 实体索引（快速查询）
  │   ├── processed.json          # 处理记录（增量处理）
  │   └── ontology.yaml           # 实体类型定义
  │
  └── ontology.yaml               # [可选] 自定义实体类型（优先级高于 .ontomark/）

```

## ontology.yaml 说明
 - ontology.yaml 定义了知识库中允许的实体类型及其属性。技能需要根据这个定义来提取和组织实体，确保所有实体都符合预定义的类型和结构。
 - 如果项目根目录下存在 ontology.yaml，技能应优先使用它来获取实体类型定义；如果不存在，则使用 .ontomark/ 目录下的 ontology.yaml。技能应支持动态更新 ontology.yaml 的能力，以便在需要时添加新的实体类型或修改现有类型的定义。

   [important] 如果 ontology.yaml 不存在，技能应引导用户创建一个新的 ontology.yaml 文件，分析raw中的内容以提供样例和建议的实体类型结构，以便用户根据自己的需求进行定制。 写入或者修改ontology.yaml 前，必须调用askForUser确认设计方案，确保符合用户的知识库构建需求。 这个文件不应该被轻易、频繁修改。

## CLI工具说明 
OntoMark 提供了一套 CLI 工具来管理知识库的构建和查询。技能需要根据用户的输入判断使用哪个工具，并按照工具的要求准备输入参数。

如果没有安装CLI ，技能应提示用户安装指南或提供相关链接。

调用方式

ontomark <command> <project-path> [options]
# 或
./ontomark <command> <project-path> [options]

---
命令总览

┌─────────────────┬───────────────────────────┐
│      命令       │           用途            │
├─────────────────┼───────────────────────────┤
│ init            │ 初始化项目结构            │
├─────────────────┼───────────────────────────┤
│ raw-status      │ 查询 raw 文件状态         │
├─────────────────┼───────────────────────────┤
│ wiki-status     │ 查询 wiki 文件状态        │
├─────────────────┼───────────────────────────┤
│ ontology-status │ 查询 ontology 状态        │
├─────────────────┼───────────────────────────┤
│ mark-processed  │ 标记文件已处理            │
├─────────────────┼───────────────────────────┤
│ wiki-write      │ 写入 wiki 页面            │
├─────────────────┼───────────────────────────┤
│ index-build     │ 构建实体索引              │
├─────────────────┼───────────────────────────┤
│ index-query     │ 查询实体是否存在          │
├─────────────────┼───────────────────────────┤
│ lint-all        │ 综合健康检查              │
└─────────────────┴───────────────────────────┘

---
命令详情

1. init — 项目初始化

ontomark init [project-path]

作用：创建 raw/、wiki/、.ontomark/ 目录

输出：
{
  "success": true,
  "path": "/path/to/project",
  "created": ["/path/to/project/raw", "/path/to/project/wiki", "/path/to/project/.ontomark"],
  "errors": []
}

---
2. raw-status — 查询待处理文件

ontomark raw-status <project-path> [--modified <true|false|all>] [--limit <number>]

参数：

┌────────────┬────────┬─────────────────────────────────────┐
│    选项    │ 默认值 │                说明                 │
├────────────┼────────┼─────────────────────────────────────┤
│ --modified │ true   │ true=待处理, false=已处理, all=全部 │
├────────────┼────────┼─────────────────────────────────────┤
│ --limit    │ 10     │ 返回文件数，0=全部                  │
└────────────┴────────┴─────────────────────────────────────┘

输出：
{
  "files": [{ "path": "raw/meeting.md", "hash": "abc123", "modified": true }],
  "total": 20,
  "pending": 5,
  "ontologyChanged": false
}

---
3. wiki-status — 查询 wiki 状态

ontomark wiki-status <project-path>

输出：
{
  "files": [{ "path": "wiki/Person/张三.md", "canonical": "张三", "type": "Person" }],
  "total": 15
}

---
4. ontology-status — 查询实体类型

ontomark ontology-status <project-path>

输出：
{
  "exists": true,
  "path": "/path/ontology.yaml",
  "entityTypes": {
    "Person": { "description": "人物", "template": { "summary": "..." } },
    "Organization": { "description": "组织", "template": { "info": [...] } }
  }
}

---
5. mark-processed — 标记已处理

# 单个文件
ontomark mark-processed <project-path> <file-path>

# 批量标记
ontomark mark-processed <project-path> --files '["raw/a.md","raw/b.md"]'

---
6. wiki-write — 写入实体

# 命令行 JSON
ontomark wiki-write <project-path> --entities '[{"canonical":"张三","type":"Person",...}]'

# 单个实体
ontomark wiki-write <project-path> \
  --canonical "张三" \
  --type "Person" \
  --content "描述内容" \
  --sources '["raw/meeting.md"]'

实体格式：
{
  canonical: string;        // 规范名称（必需）
  type: string;             // 实体类型（必需）
  content: string;          // 描述内容（必需）
  sources: SourceRef[];     // 来源（必需）
  aliases?: string[];       // 别名
  needsReview?: boolean;    // 是否需审核
}

输出：
{
  "total": 3,
  "failed": 0,
  "results": [
    { "canonical": "张三", "success": true, "path": "wiki/Person/张三.md" }
  ]
}

---
7. index-build — 构建索引

ontomark index-build <project-path>

作用：扫描 wiki/，生成 .ontomark/index.json

---
8. index-query — 查询实体

# 精确匹配
ontomark index-query <project-path> <name>

# 模糊匹配
ontomark index-query <project-path> <name> --fuzzy

输出：
{ "found": true, "canonical": "张三", "type": "Person", "path": "Person/张三.md", "aliases": ["老张"] }

---
9. lint-all — 健康检查

ontomark lint-all <project-path>

输出：
{
  "orphans": ["wiki/Concept/废弃概念.md"],
  "missing": [{ "entity": "不存在的实体", "referencedBy": ["wiki/Person/张三.md"] }],
  "empty": ["wiki/Organization/空公司.md"],
  "totalIssues": 3
}

---

增量处理机制

┌───────────────────────┬──────────────────────────────────────────┐
│         字段          │                   含义                   │
├───────────────────────┼──────────────────────────────────────────┤
│ ontologyChanged: true │ ontology.yaml 已变化，所有文件需重新处理 │
├───────────────────────┼──────────────────────────────────────────┤
│ pending: N            │ 待处理文件数量                           │
├───────────────────────┼──────────────────────────────────────────┤
│ modified: true        │ 文件内容已变化                           │
└───────────────────────┴──────────────────────────────────────────┘





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

1. **先读后写** — 调用 `wiki-write` 前必须先检索并读取wiki下的实体，确保不重复创建实体并保持一致性。如果存在同名实体，必须进行合并或更新，而不是新建。
2. **类型来源** — 所有实体类型必须通过 `ontomark ontology-status <project-path>` 命令获取。技能目录下的 `reference/ontology.yaml` 仅为格式样例，切勿直接使用样例中的类型名称。
3. **来源追溯** — 每个实体必须记录 sources
4. **WikiLinks 由 LLM 标注** — CLI 不处理语义标注，由技能负责将文本中的实体标注为 WikiLinks，并确保与 wiki 中的实体链接一致。
