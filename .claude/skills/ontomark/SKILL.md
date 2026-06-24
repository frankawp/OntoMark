---
name: ontomark
description: Use when building or querying an OntoMark wiki knowledge base. Triggers for ingesting new sources, answering questions about the wiki, or health-checking the knowledge graph. Make sure to use this skill whenever the user mentions knowledge base, wiki, ontology, entities, or wants to ingest/process/query documents, even if they don't explicitly ask for 'ontomark.'
---

# OntoMark Skill

> 将文档转化为持久化知识库。入口：`/ontomark`（也可直接调用子命令）

## 命令速查

| 命令 | 用途 | 说明 |
|------|------|------|
| `/ontomark-init` | 初始化项目结构 | 插件命令 |
| `/ontomark-ingest` | 从 raw 文档提取实体，写入 wiki | 插件命令 |
| `/ontomark-query` | 查询 wiki 知识，生成回答 | 插件命令 |
| `/ontomark-lint` | 检查 wiki 健康状态 | 插件命令 |
| `/ontomark` | 意图识别入口（按关键词分发） | Skill 入口 |

## CLI检查
- 在执行任何操作前，技能必须检查 `ontomark` CLI 是否已安装并可在当前环境中调用，以及是否具有执行权限。如果没有安装，技能应提示用户安装指南或提供相关链接。

## 意图识别

当用户没有明确指定子命令时，根据关键词分发：

| 关键词模式 | 工作流 | 对应命令 |
|-----------|--------|---------|
| 初始化/创建项目/init | Init | `/ontomark-init` |
| 处理/添加/导入/ingest | Ingest | `/ontomark-ingest` |
| 谁/什么/查询/query | Query | `/ontomark-query` |
| 检查/lint/健康/孤立 | Lint | `/ontomark-lint` |

## 工作流参考

- **[Ingest](./ingest.md)** — 从 raw 文档提取实体，写入 wiki
- **[Query](./query.md)** — 查询 wiki 知识，生成回答
- **[Lint](./lint.md)** — 检查 wiki 健康状态，建议修复

## 强制规则

1. **先读后写** — 调用 `wiki-write` 前必须先读取或查询实体状态
2. **类型来源** — 所有实体类型从 `ontology-status` 获取，不硬编码
3. **来源追溯** — 每个实体必须记录 sources
4. **WikiLinks 由 LLM 标注** — CLI 不处理语义标注
5. **直接调用子命令** — 用户明确指定时，直接加载对应工作流文件而非走意图识别

## CLI 工具速查

调用方式：`ontomark <command> <project-path>` 或 `./ontomark <command> <project-path>`

### 项目初始化

```bash
# 初始化项目（创建 raw/、wiki/、.ontomark/ 目录）
# ontology.yaml 由 Ingest 第一次执行时自动生成，无需手动创建
ontomark init [project-path]
```

### 状态查询

```bash
# 获取可用实体类型
ontomark ontology-status <project-path>
# 返回: { exists, path, entityTypes: { Person: {...}, Organization: {...}, ... } }

# 获取待处理文件
ontomark pending-files <project-path>
# 返回: { files: string[], total: number, ontologyChanged: boolean, lastHash: string }

# 获取 wiki 文件状态
ontomark wiki-status <project-path>
# 返回: { files: [{path, canonical, type}], total }
```

**增量处理机制**：
- `ontologyChanged: true` 表示 ontology.yaml 在此批次中有变更
- `total` 表示需要处理的文件数量
- 变更检测基于 git commit hash，只检出当前用户提交的变更

### Wiki 写入

```bash
# 批量写入（推荐）
ontomark wiki-write <project-path> --file entities.json
ontomark wiki-write <project-path> --entities '[...]'

# 单个写入
ontomark wiki-write <project-path> \
  --canonical "实体名称" \
  --type "Person" \
  --content "实体描述内容" \
  --sources '["raw/file.md"]' \
  --is-update false
```

**实体格式**：
```typescript
interface WikiWriteEntity {
  canonical: string;        // 规范名称（必需）
  type: string;              // 实体类型（必需，必须存在于 ontology）
  content: string;           // 实体描述内容（必需）
  sources: SourceRef[];      // 来源（必需）
  aliases?: string[];        // 别名
  info?: Record<string, string>;  // 关键信息
  needsReview?: boolean;     // 是否需审核
  isUpdate: boolean;         // true=更新, false=新建
}

// sources 支持两种格式：
type SourceRef = string | { file: string; lines?: number[] };
// 字符串格式: "raw/file.md"
// 对象格式: { file: "raw/file.md", lines: [1, 5] }
```

**返回结果**：
```typescript
interface WikiWriteResult {
  total: number;      // 总数
  created: number;    // 新建数
  updated: number;    // 更新数
  failed: number;     // 失败数
  results: WikiWriteItemResult[];
}

interface WikiWriteItemResult {
  canonical: string;
  success: boolean;
  path?: string;
  action: 'created' | 'updated';
  error?: string;     // 失败时包含友好提示
}
```

### 标记处理

```bash
# 标记当前 HEAD 为已处理状态
ontomark mark-processed <project-path>
```

### 索引操作

```bash
# 构建实体索引
ontomark index-build <project-path>

# 查询实体是否存在
ontomark index-query <project-path> <name>
ontomark index-query <project-path> <name> --fuzzy  # 模糊匹配
# 返回: { found, canonical?, type?, path?, aliases? }
```

### 健康检查

```bash
ontomark lint-all <project-path>
# 返回: { orphans, missing, empty, totalIssues }
```