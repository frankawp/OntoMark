# 实体页面格式规范

**日期：** 2026-06-25
**状态：** 设计已确认

## 概述

统一 OntoMark wiki 实体页面的 frontmatter 和 content 格式规范，消除现有设计中的冗余和不一致，提升 wiki 知识库的可维护性和可读性。

## 核心原则

1. **Frontmatter 是结构化数据的唯一来源** — 正文不重复 frontmatter 中的结构化数据
2. **正文给人读** — 自然的 prose + WikiLinks
3. **关系声明在 frontmatter** — `relations` 块存储结构化关系，正文只用普通 `[[wikilinks]]`
4. **来源追溯精确化** — 支持 `cite` 字段记录具体段落位置

## Frontmatter 字段规范

### 字段总表

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `canonical` | 是 | string | 规范名称，全局唯一标识实体 |
| `type` | 是 | string | 知识维度，必须存在于 ontology.md |
| `aliases` | 否 | string[] | 别名列表，用于 index-query 模糊匹配 |
| `status` | 否 | string | `active`（默认）\| `stub` \| `needs_review` \| `deprecated` \| `redirect` |
| `redirect` | 否 | string | 当 `status=redirect` 时，指向的目标 canonical |
| `tags` | 否 | string[] | 自由标签，不限定于 ontology 维度 |
| `provenance` | 是 | object[] | 来源追溯（见下方格式） |
| `relations` | 否 | object[] | 结构化关系声明（见下方格式） |
| `updated` | 否 | string | 最后更新日期，ISO 8601 格式（如 `2026-06-25`） |

### provenance 格式

```yaml
provenance:
  - source: raw/article.md          # 来源文件路径
    cite: 第三段                     # 精确引用位置（可选）
    retrieved: 2026-06-25           # 提取日期
  - conversation: 2026-06-25        # 或：对话日期
    summary: 用户补充了角色信息     # 对话内容摘要（可选）
```

### relations 格式

```yaml
relations:
  - type: employs           # 关系类型（动词/介词，自由定义，如 employs/develops/participates）
    target: OpenAI           # 目标实体 canonical
    label: CEO              # 关系上的标签文本（可选）
```

### status 说明

| 值 | 含义 | 适用场景 |
|-----|------|---------|
| `active` | 正常状态，内容完整可靠 | 默认值 |
| `stub` | 初始版本，内容不完整 | 刚提取、信息较少 |
| `needs_review` | 需人工审核 | 来源冲突、对话提取的信息 |
| `deprecated` | 已废弃，保留页面供追溯 | 实体不再相关 |
| `redirect` | 重定向到其他实体 | 同名实体合并、别名拆分 |

## Content 正文规范

### 通用规则

- 开篇用 `# {canonical}` 作为一级标题
- 正文使用自然的 prose 描述
- **不包含"关键信息"表格** — 结构化数据只放在 frontmatter
- WikiLinks 使用普通 `[[canonical]]` 语法，不附加关系类型
- 末尾推荐 `## 关联实体` 章节列出相关 WikiLinks

### 按 type 推荐章节结构

| type | 推荐正文结构 |
|------|------------|
| Actor | 简介 → `## 履历` → `## 关联实体` |
| Event | `## 概述` → `## 时间线` → `## 参与方` → `## 影响` |
| Thing | 简介 → `## 特征` → `## 关联` |
| Organization | 简介 → `## 历史` → `## 产品/服务` → `## 关键人物` |
| Topic | 简介 → `## 子领域` → `## 关键概念` |

推荐结构是建议性的，实体页面编写者可根据实际情况调整。

## 完整示例

```markdown
---
canonical: Sam Altman
type: Actor
aliases: [Altman, Sam, 山姆·奥特曼]
status: active
tags: [科技领袖, AI安全]
provenance:
  - source: tests/.../How_OpenAI's_ChatGPT_has_changed.md
    cite: 第二段
    retrieved: 2026-06-25
relations:
  - type: employs
    target: OpenAI
    label: CEO
  - type: develops
    target: ChatGPT
updated: 2026-06-25
---

# Sam Altman

OpenAI 的 CEO，在 AI 领域有重要影响。

2023 年 11 月曾被 OpenAI 董事会解雇，但在 72 小时混乱后复职。

## 履历

- 2015 — 联合创立 [[OpenAI]]
- 2022-11 — 发布 [[ChatGPT]]
- 2023-11 — 被解雇后复职

## 关联实体

- [[OpenAI]] — 担任 CEO
- [[ChatGPT]] — 主导开发
- [[GPT-4]] — 参与发布
```

## 从旧格式迁移说明

| 旧字段 | 新字段 | 迁移操作 |
|--------|--------|---------|
| `entity_type` | `type` | 重命名 |
| `last_updated` | `updated` | 重命名 |
| `sources[].file` | `provenance[].source` | 重命名 |
| `sources[].context` | `provenance[].cite` | 重命名 |
| `status: canonical` | `status: active` | 重映射 |
| `status: draft` | `status: needs_review` | 重映射 |
| `info` | 删除 | 数据迁移到正文或 `relations` |
| `sources` 数组 | `provenance` 数组 | 结构升级 |
| （新增） | `redirect` | 新字段 |
| （新增） | `tags` | 新字段 |
| （新增） | `relations` | 新字段 |
| 正文"关键信息"表格 | 删除 | 不再生成 |
