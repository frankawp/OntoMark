# OntoMark V3 Skill 设计文档

> Claude Code 技能层，编排 V3 CLI 工具完成知识库工作流

## 概述

**入口：** `/ontomark`（主入口 + 子命令支持）

**核心职责：**
- 用户意图识别
- LLM 调用（实体提取、WikiLinks 标注、回答生成）
- 调用 V3 CLI 工具
- 工作流编排

**非职责：**
- 文件操作（由 CLI 工具完成）
- 类型硬编码（从 ontology 获取）
- 自动存储（需用户确认）

---

## 文件结构

```
.claude/skills/ontomark/
├── SKILL.md                    # 入口 + 意图识别
├── ingest.md                   # Ingest 工作流
├── query.md                    # Query 工作流
├── lint.md                     # Lint 工作流
└── reference/
    ├── entity-extraction.md    # 实体提取 Prompt 模板
    ├── wikilinks-annotation.md # WikiLinks 标注规则
    └── conflict-resolution.md  # 冲突处理策略
```

---

## Section 1: SKILL.md 入口设计

```markdown
# OntoMark Skill

> 将文档转化为持久化知识库。入口：`/ontomark`

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
```

---

## Section 2: Ingest 工作流

```markdown
# Ingest 工作流

> 从 raw 文档提取实体，写入 wiki。

## 触发条件

- 用户输入：`/ontomark` + 含有"处理/添加/导入"等关键词
- 或显式调用：`/ontomark ingest [文件路径]`

## 工作流程

```
1. [Tool] ontology-status → 获取可用实体类型
2. [Tool] raw-status → 获取待处理文件列表
3. [Read] 读取 raw 文档内容
4. [LLM]  多层实体提取：
   
   第一层：直接识别
   - 从文档中明确提到的实体名称识别
   
   第二层：上下文推断
   - 分析段落上下文，推断隐含实体
   - 例："比赛在主场举行" → 推断主场城市
   
   第三层：全局总结
   - 总结文档主题，提取概念性实体
   - 例：整篇讨论 NHL 新秀 → 提取 NHL、赛季等概念

5. [Tool] index-query → 检查每个实体是否已存在
6. [LLM]  处理 WikiLinks 标注：
   - 对 context 中的实体引用进行 [[canonical]] 标注
   - 别名映射到规范名称
7. [Tool] wiki-write → 批量写入所有实体
8. [Tool] mark-processed → 标记文件已处理
9. [Tool] index-build → 重建索引
```

## 实体提取 Prompt 结构

```
你是一个知识提取专家。请从文档中提取实体。

## 实体类型定义
{ontology entity_types}

## 提取策略

### 第一层：直接识别
扫描文档，识别明确提到的实体名称。

### 第二层：上下文推断
分析每个段落的上下文：
- 代词指代："他在比赛中的表现" → 关联前文提到的实体
- 隐含地点："主场观众" → 推断所在城市
- 时间线索："本赛季" → 关联具体赛季

### 第三层：全局总结
总结文档整体主题：
- 核心话题 → 概念实体
- 讨论范围 → 领域实体
- 事件背景 → 环境实体

## 输出格式
[entities 列表，每个包含 name, type, aliases, info, context, extraction_type]
```

## 输出字段说明

- `extraction_type`: `direct` | `inferred` | `summarized`
  - `direct`: 文档中明确提及
  - `inferred`: 从上下文推断
  - `summarized`: 从全局总结得出

## 错误处理

- 类型不存在 → 提示用户更新 ontology 或选择最接近类型
- 文件已处理 → 跳过或询问是否强制重处理
```

---

## Section 3: Query 工作流

```markdown
# Query 工作流

> 查询 wiki 知识，生成回答，用户确认后可选存储。

## 触发条件

- 用户输入：`/ontomark` + 含有"谁/什么/查询/列出"等关键词
- 或显式调用：`/ontomark query [问题]`

## 工作流程

```
1. [LLM]  解析用户问题，识别涉及的实体/概念
2. [Tool] index-query → 查询每个实体是否存在
3. [Read] 读取相关实体页面
4. [LLM]  综合多个实体信息，生成回答
5. [展示] 向用户展示回答
6. [询问] "这个回答有价值，要存入 wiki 作为 Topic 页面吗？"
   
   用户同意 → [Tool] wiki-write → 创建 Topic 页面
   用户拒绝 → 结束，不存储
```

## 回答形式

根据问题类型选择输出格式：

| 问题类型 | 输出格式 |
|---------|---------|
| 简单查询 | 直接文本回答 + 来源链接 |
| 对比分析 | Markdown 表格 |
| 关系梳理 | Mermaid 图表 |
| 事件梳理 | 时间线列表 |

## Topic 页面命名

- 使用用户问题的核心概念作为 canonical
- 自动关联涉及的实体（WikiLinks）
- 标记 `needs_review: false`（用户已确认）

## 来源追溯

回答中每个关键信息必须标注来源：
- `[[实体名]] (来源段落)`
- 多来源时标注所有来源
```

---

## Section 4: Lint 工作流

```markdown
# Lint 工作流

> 检查 wiki 健康状态，发现问题并建议修复。

## 触发条件

- 用户输入：`/ontomark` + 含有"检查/lint/健康/孤立"等关键词
- 或显式调用：`/ontomark lint`

## 工作流程

```
1. [Tool] lint-all → 获取所有问题
   - orphans: 孤立页面（无入链）
   - missing: 缺失链接（引用不存在实体）
   - empty: 空内容页面

2. [LLM]  分析问题严重程度：
   
   🔴 高优先级：
   - 缺失链接被多个页面引用
   - 核心实体页面为空
   
   🟡 中优先级：
   - 孤立页面（有价值但未被引用）
   - 空页面（内容过少）
   
   🟢 低优先级：
   - 少量孤立页面
   - 单一缺失链接

3. [展示] 按优先级展示问题列表

4. [询问] "发现 X 个问题，建议修复：[问题摘要]。是否自动修复？"

   用户同意 → 执行修复流程
   用户拒绝 → 结束，仅报告

5. [Tool] wiki-write → 执行修复（更新相关页面）
6. [Tool] index-build → 重建索引
7. [Tool] lint-all → 验证修复结果
```

## 自动修复策略

### 缺失链接修复

- 从 `missing.referencedBy` 页面移除无效链接
- 或建议用户创建缺失实体

### 孤立页面修复

- 分析孤立实体内容，找到相关实体
- 在相关实体页面添加引用链接
- 或标记为需要人工审核

### 空页面修复

- 标记 `needs_review: true`
- 建议用户补充内容或从 raw 重新提取

## 报告格式

```markdown
## Wiki 健康检查结果

### 🔴 高优先级 (X 个)
- [[Entity A]] 被 3 个页面引用但不存在
  → 建议：创建实体 或 移除引用

### 🟡 中优先级 (X 个)
- [[Orphan B]] 无入链
  → 建议：在 [[Related C]] 添加引用

### 🟢 低优先级 (X 个)
- [[Empty D]] 内容少于 50 字符
  → 建议：补充内容

**总计：X 个问题**
```
```

---

## V3 CLI 工具依赖

| 工具 | Ingest | Query | Lint |
|-----|--------|-------|------|
| `ontology-status` | ✅ | - | - |
| `raw-status` | ✅ | - | - |
| `wiki-status` | - | - | - |
| `mark-processed` | ✅ | - | - |
| `wiki-write` | ✅ | ✅ | ✅ |
| `index-build` | ✅ | - | ✅ |
| `index-query` | ✅ | ✅ | - |
| `lint-all` | - | - | ✅ |

---

## 关键决策总结

| 问题 | 决策 |
|-----|------|
| 入口模式 | 混合：`/ontomark` 主入口 + 子命令 |
| 意图判断 | 分析用户输入内容 |
| 提取策略 | 批量提取 + 多层识别（直接/推断/总结） |
| WikiLinks 标注 | Skill 中 LLM 完成 |
| Query 存储策略 | 用户确认后存储 |
| Lint 修复策略 | 报告 + 建议修复，用户确认后执行 |
