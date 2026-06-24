---
name: ontomark-query
description: 查询 wiki 知识库并生成回答。当用户说"谁/什么/查询/列出"时由 ontomark 主技能分发。
---

# Query 工作流

> 查询 wiki 知识，生成回答，用户确认后可选存储。

## 触发条件

- 用户输入：`/ontomark` + 含有"谁/什么/查询/列出"等关键词
- 或显式调用：`/ontomark-query [问题]`
- 或由 `/ontomark` 主技能分发

## CLI 调用方式

```bash
ontomark <command> <project-path>
```

### 索引查询

```bash
# 构建实体索引
ontomark index-build <project-path>

# 查询实体是否存在
ontomark index-query <project-path> <name>
ontomark index-query <project-path> <name> --fuzzy  # 模糊匹配
# 返回: { found, canonical?, type?, path?, aliases? }
```

### Wiki 写入

使用 Write 工具直接写入 Markdown 文件（格式见 ingest 技能"写入实体页面"章节）。

### 状态查询

```bash
# 获取 wiki 文件状态
ontomark wiki-status <project-path>
# 返回: { files: [{path, canonical, type}], total }

# 获取可用实体类型
ontomark ontology-status <project-path>
```

## 工作流程

### 第一步：解析问题

1. 分析用户问题，识别涉及的实体/概念

### 第二步：查询实体

2. 调用 `index-query` → 查询每个实体是否存在
3. Read → 读取相关实体页面

### 第三步：生成回答

4. 综合多个实体信息，生成回答
5. 根据问题类型选择输出格式

### 第四步：展示与存储

6. 向用户展示回答
7. 询问："这个回答有价值，要存入 wiki 作为 Topic 页面吗？"

   用户同意 → 使用 Write 工具创建 Topic 页面（参考 ingest 技能的 Markdown 格式）
   用户拒绝 → 结束，不存储

## 回答形式

| 问题类型 | 输出格式 | 示例 |
|---------|---------|------|
| 简单查询 | 直接文本 + 来源 | "John Doe 是一名工程师，来自 [[Article]]" |
| 对比分析 | Markdown 表格 | `\| 属性 \| A \| B \|` |
| 关系梳理 | Mermaid 图表 | `graph LR; A --> B` |
| 事件梳理 | 时间线列表 | `- 2026-01: 事件A` |

## Topic 页面命名规则

- 使用用户问题的核心概念作为 canonical
- 自动关联涉及的实体（WikiLinks）
- 标记 `needs_review: false`（用户已确认）
- sources 包含所有引用的实体

## 来源追溯

回答中每个关键信息必须标注来源：
- 单来源：`[[实体名]] (来源段落)`
- 多来源：`[[实体A]], [[实体B]]`

## 示例

**用户问题：** "John Doe 和 Jane Doe 有什么关系？"

**回答：**
```markdown
John Doe 和 Jane Doe 是同事关系。

| 属性 | John Doe | Jane Doe |
|------|----------|----------|
| 角色 | 工程师 | 设计师 |
| 部门 | 技术部 | 产品部 |

来源：[[John Doe]], [[Jane Doe]]
```
