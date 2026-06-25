---
name: ontomark-ingest
description: Use when processing documents, conversations, or code into wiki entity pages. Triggered by ontomark root skill or user keywords: 处理/添加/导入/ingest.
---

# Ingest 工作流

从原始文档或对话记录中提取实体，写入结构化的 wiki 知识库。

> **前置条件**：项目已通过 `/ontomark-init` 初始化，存在 `.ontomark/config.json` 和 `ontology.md`。

## 工作流

```dot
digraph ingest_flow {
    "Read config + ontology" [shape=box];
    "pending-files" → "文件为空?" [shape=box];
    "文件为空?" [shape=diamond];
    "文件为空?" -> "结束" [label="是"];
    "文件为空?" -> "▶ 模式选择" [label="否"];
    "▶ 模式选择" [shape=diamond];
    "▶ 模式选择" -> "逐一模式" [label="逐一深入"];
    "▶ 模式选择" -> "批量模式" [label="批量快速"];
    "逐一模式" -> "Read 原始文件" [shape=box];
    "批量模式" -> "Read 原始文件" [shape=box];
    "Read 原始文件" -> "实体提取\n[entity-extraction.md]" [shape=box];
    "实体提取\n[entity-extraction.md]" -> "讨论门\n(展示关键发现)" [shape=diamond];
    "讨论门\n(展示关键发现)" -> "精炼提取" [label="有反馈"];
    "精炼提取" -> "WikiLinks 标注\n[wikilinks-annotation.md]";
    "讨论门\n(展示关键发现)" -> "WikiLinks 标注\n[wikilinks-annotation.md]" [label="✅ 确认"];
    "WikiLinks 标注\n[wikilinks-annotation.md]" -> "冲突检查\n[conflict-resolution.md]" [shape=box];
    "冲突检查\n[conflict-resolution.md]" -> "有冲突?" [shape=diamond];
    "有冲突?" -> "询问用户" [label="是"];
    "有冲突?" -> "自动处理" [label="否"];
    "询问用户" -> "Write 实体页面";
    "自动处理" -> "Write 实体页面";
    "Write 实体页面" -> "补链\n(补充缺失 WikiLinks)";
    "补链\n(补充缺失 WikiLinks)" -> "log.md 追加";
    "log.md 追加" -> "mark-processed → index-build";
    "mark-processed → index-build" -> "输出报告" [shape=box];
}
```

### ① 准备

1. **Read** `.ontomark/config.json` — 获取 `inputDirs` 和 `outputDir`
2. **Read** `ontology.md` — 获取实体类型定义（注入提取提示词用）
3. **pending-files** — 获取待处理文件：
   ```bash
   ontomark pending-files <project-path>
   ```
   返回：
   ```json
   { "files": ["raw/a.md", "raw/b.md"], "total": 2, "lastHash": "abc123" }
   ```
   - `files` 为空 → 无待处理，结束流程

4. **模式选择** — 向用户展示文件列表，让用户选择处理方式：

   ```
   📋 待处理文件（{N} 个）：
     1. <path1>
     2. <path2>

   请选择处理方式：
   A. 逐一深入 — 每个文件单独讨论和确认，适合重要或内容复杂的新源
   B. 批量快速 — 合并提取后展示总摘要，一次确认，适合例行更新或相似内容
   ```

   - 选择 **逐一模式** → 后续每个文件独立走提取 → 讨论门 → 写入流程
   - 选择 **批量模式** → 合并处理，只在合并摘要后触发一次讨论门

### ② 读取

4. 对每个待处理文件：**Read** 原始内容
   - Markdown 文件直接读全文
   - 其他格式（代码、文本等）也直接读取

### ③ 提取

5. **实体提取** — 遵循 [reference/entity-extraction.md](reference/entity-extraction.md) 的三层策略：
   - 第一层：直接识别（明确提及的名称）
   - 第二层：上下文推断（代词、隐含地点/时间）
   - 第三层：全局总结（概念性实体）

   将步骤 2 读到的 `ontology.md` 实体类型注入提示词。

### ④ 讨论

6. 提取完成后，向用户展示关键发现：

   ```
   📖 文档：{文件名}

   关键发现：
   ├─ 核心实体：[[名称]]（类型/说明）
   ├─ 关联实体：[[名称]]（类型/说明）
   └─ 已有实体更新：[[名称]] 补充信息

   你觉得这个方向对吗？要调整重点还是继续？
   ```

7. 用户可：
   - **确认** → 直接进入 WikiLinks 标注
   - **补充**（如"定价信息也重要"）→ AI 精炼提取后继续
   - **修正**（如"名称不对"）→ AI 修正后继续
   - **重定向**（如"我更关注 X"）→ AI 重新搜索相关段落
   - **跳过** → 不处理此文件，进入下一个

### ⑤ WikiLinks + 冲突解决

8. **WikiLinks 标注** — 遵循 [reference/wikilinks-annotation.md](reference/wikilinks-annotation.md)：
   - 对提取结果做 WikiLinks 标注
   - 对每个实体调用 `index-query` 检查是否存在：
     ```bash
     ontomark index-query <project-path> "<name>" [--fuzzy]
     ```
   - `found: true` → 使用现有 canonical 做链接目标
   - `found: false` → 使用提取的 name 做链接目标

9. **冲突解决** — 对每个提取的实体，按 [reference/conflict-resolution.md](reference/conflict-resolution.md) 处理：

   | 条件 | 操作 |
   |------|------|
   | 不存在 | 直接新建，无需确认 |
   | 完全一致 | 跳过 |
   | 新增别名/补充 info | 自动合并 |
   | info 冲突 | 询问用户 |
   | 类型不匹配 | 询问用户 |

### ⑥ 写入

10. **Write** 实体页面到 `{outputDir}/{EntityType}/{CanonicalName}.md`
    - 新建：完整 frontmatter + 正文
    - 更新：Read 现有文件 → 合并 aliases、sources、正文 → 重新写入
    - 格式见下方"实体页面格式"
    - **sources 增强**：每个来源记录 `file` 和 `context`（段落位置）

11. **补链** — 在已有 wiki 页面中补充缺失的 WikiLinks：

    收集本次新建实体的名称和别名，在已有页面（排除本次写入的页面）中搜索这些名称是否已出现但未链接：

    ```
    📎 新实体 [[GPT-4]] 的别名包括 [GPT-4, GPT4]

    在已有页面中发现 2 处未链接的提及：
      · [[ChatGPT]] — "...基于 GPT-4 大语言模型..." → [[GPT-4]]
      · [[OpenAI]] — "...2023 年发布了 GPT-4..." → [[GPT-4]]

    是否自动补充这些链接？
    ```

    - 搜索目标：本次新建实体的 `canonical` + `aliases`
    - 匹配方式：大小写不敏感
    - 排除已链接：已存在 `[[名称]]` 的跳过
    - 用户确认后 → **Write** 更新匹配页面

12. **标记已处理**：
    ```bash
    ontomark mark-processed <project-path>
    ```

### ⑦ 记录

13. **追加 log.md** — 使用 Write 工具在项目根目录 `log.md` 末尾追加操作记录：

    ```markdown
    ## [2026-06-25] ingest | 文档标题

    type: ingest
    files: ["raw/article.md"]
    entities:
      - + EntityName (Type)
      - ~ ExistingEntity (updated)
    status: success
    ---
    ```

    > 如果 `log.md` 不存在则自动创建。

14. **重建索引**：
    ```bash
    ontomark index-build <project-path>
    ```
    `index-build` 会自动更新 `.ontomark/index.json` 和 `wiki/index.md`。

### ⑧ 报告

15. 向用户展示输出报告。

---

## CLI 命令参考

| 命令 | 作用 | 输出关键字段 |
|------|------|-------------|
| `ontomark pending-files <path>` | 待处理文件 | `files[], total, lastHash` |
| `ontomark mark-processed <path>` | 标记 HEAD 为已处理 | ✅ 确认信息 |
| `ontomark index-build <path>` | 全量重建索引 | 索引实体数 |
| `ontomark index-query <path> <name> [--fuzzy]` | 查询实体 | `found, canonical?, type?, path?, aliases?` |
| `ontomark wiki-status <path>` | wiki 状态 | `files[], total` |

---

## 实体页面格式

```markdown
---
canonical: Sam Altman
type: Actor
aliases: [Altman, Sam, 山姆·奥特曼]
status: active
tags: [科技领袖]
provenance:
  - source: raw/article.md
    cite: 第三段
    retrieved: 2026-06-25
relations:
  - type: employs
    target: OpenAI
    label: CEO
updated: 2026-06-25
---

# Sam Altman

OpenAI 的 CEO，在 AI 领域有重要影响。

## 履历

- 2015 — 联合创立 [[OpenAI]]
- 2022-11 — 发布 [[ChatGPT]]
- 2023-11 — 被解雇后复职

## 关联实体

- [[OpenAI]] — 担任 CEO
- [[ChatGPT]] — 主导开发
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `canonical` | 是 | 规范名称，全局唯一标识实体 |
| `type` | 是 | 知识维度，必须存在于 ontology.md |
| `aliases` | 否 | 别名，用于 index-query 模糊匹配 |
| `status` | 否 | `active`（默认）\| `stub` \| `needs_review` \| `deprecated` \| `redirect` |
| `redirect` | 否 | 当 `status=redirect` 时指向的目标 canonical |
| `tags` | 否 | 自由标签，不限定于 ontology 维度 |
| `relations` | 否 | 结构化关系声明：`{type, target, label?}` |
| `provenance` | 是 | 来源追溯：`{source, cite?, retrieved?}` 或 `{conversation, summary?}` |
| `updated` | 否 | ISO 8601 日期 |
| `needs_review` | 否 | `true` 表示需人工审核（兼容旧数据） |

---

## 决策矩阵

| 场景 | 行为 |
|------|------|
| 逐一模式 | 逐文件走提取 → 讨论门 → 精炼 → 写入，每个文件独立确认 |
| 批量模式 | 合并提取 → 展示总摘要 → 一次讨论门 → 全部写入 |
| 讨论门：用户确认 | 进入 WikiLinks |
| 讨论门：用户补充/修正 | 精炼提取后继续 |
| 讨论门：用户跳过 | 不处理此文件，进入下一个 |
| 新实体 | 直接新建 |
| 完全重复 | 跳过 |
| 新增别名/补充 info | 自动合并 |
| info 冲突 | 询问用户 |
| 类型不匹配 | 询问用户 |
| 对话来源 | 默认 `needs_review: true` |

---

## 处理对话来源

当知识来源于对话而非文档时：

- **提取**用户明确提到的实体、修正或补充的信息、达成的共识
- **sources** 使用 `conversation` 字段：
  ```json
  { "conversation": "2026-06-25", "summary": "讨论了 Connor 最新数据" }
  ```
- 对话来源实体默认 `needs_review: true`
- 流程与文档提取一致，写入同一 wiki 目录

---

## 错误处理

| 场景 | 处理 |
|------|------|
| `.ontomark/config.json` 不存在 | 提示运行 `/ontomark-init`，中止 |
| `ontology.md` 不存在 | 提示运行 `/ontomark-init`，中止 |
| `pending-files` 失败 | 检查 git 仓库状态，中止 |
| `mark-processed` 失败 | 输出已写入的实体，提示手动标记 |
| 写入失败 | 检查路径和权限 |
| 非 git 仓库 | 提示 OntoMark 依赖 git 检测变更 |

---

## 输出报告

```markdown
## Ingest 完成

处理模式：{逐个/批量}
处理文件：{N} 个
├─ 新建实体：{N} 个
├─ 更新实体：{N} 个
├─ 跳过（重复）：{N} 个
└─ 需人工审核：{N} 个

提取来源：
├─ 直接识别：{N} 个
├─ 上下文推断：{N} 个
└─ 全局总结：{N} 个

实体类型分布：
├─ Person：{N} 个
├─ Event：{N} 个
└─ ...
```
