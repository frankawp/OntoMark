# ontomark-explore — 知识点驱动探索工作流

**日期：** 2026-06-25
**状态：** 设计已确认

## 概述

新增一个独立子技能 `ontomark-explore`，实现"知识点驱动"的 wiki 写入策略。与现有的 `ontomark-ingest`（文件变更批处理）互补，提供一种对话式、探索式的知识录入路径。

## 与 `ontomark-ingest` 的对比

| 维度 | `ontomark-ingest`（批处理） | `ontomark-explore`（探索） |
|------|---------------------------|--------------------------|
| 驱动力 | 文件变更驱动 | 知识兴趣驱动 |
| 起点 | `pending-files` 发现的变更 | 用户说的知识点 |
| 目标 | 处理所有待处理文件 | 深入挖掘一个知识点 |
| 用户交互 | 批量确认 | 逐轮对话确认 |
| 搜索范围 | 只看 pending-files 列表 | 全 raw 目录关键词搜索 |
| 适用场景 | 日常增量维护 | 了解新领域、深度挖掘 |

## 工作流

### 阶段一：上下文构建

1. **Read** `ontology.md` — 了解知识维度和属性定义
2. `ontomark wiki-status <path>` — 查看 wiki 整体状况
3. `ontomark index-query <path> <关键词> --fuzzy` — 检查已有实体是否相关

### 阶段二：在 raw 中探索

1. 从用户的知识点中提取搜索关键词
2. 用 `grep -ril <关键词> <inputDir>/` 在 raw 中匹配文件
3. **Read** 匹配的文件，判断是否与知识点相关
4. 筛选出真正相关的文件

### 阶段三：建议与确认

AI 向用户展示发现，包括：
- 匹配的相关文件摘要
- 建议提取的实体（名称、类型、依据）
- 与现有 wiki 中实体的关联关系

用户可选择：
- **接受** → 进入执行阶段
- **提出新方向** → 回到阶段二重新搜索
- **补充信息** → AI 调整理解后继续

### 阶段四：执行写入

完全复用 `ontomark-ingest` 的写入流程：
- 三层实体提取（参考 `entity-extraction.md`）
- WikiLinks 标注（参考 `wikilinks-annotation.md`）
- 冲突解决（参考 `conflict-resolution.md`）
- **Write** 实体页面到 `{outputDir}/{EntityType}/{CanonicalName}.md`
- `ontomark mark-processed <project-path>`
- `ontomark index-build <project-path>`

### 阶段五：循环探索

写入完成后询问用户：
- 是否基于新写入的实体继续探索关联知识？
- 是否有其他方向想了解？

## 触发方式

| 方式 | 示例 |
|------|------|
| 显式调用 | `/ontomark-explore 中国AI编程工具` |
| 对话触发 | 用户说"最近 DeepSeek 发布了新模型"，AI 检测到知识点后主动询问 |
| 主技能路由 | `/ontomark explore`，由 ontomark 根技能分发 |

## 文件结构

```
skills/ontomark-explore/
├── SKILL.md              # 新技能主文件
└── reference/            # 复用现有 reference（按需引用）
```

> 不新增 reference 文件，直接引用 `ontomark-ingest/reference/` 中的提取、标注、冲突处理文档。

## 根技能路由变更

在 `skills/ontomark/SKILL.md` 的意图识别表中增加：

| 关键词模式 | 工作流 | 子技能 |
|-----------|--------|--------|
| explore/探索/知识点/搜索/了解 | Explore | 调用 Skill: `ontomark-explore` |

## 注意事项

1. grep 搜索时考虑多个 inputDir
2. 用户说的知识点可能是模糊的，AI 需要主动澄清和缩小范围
3. 如果匹配文件过多（>10），优先阅读文件摘要而非全文
4. 对话来源的知识点默认 `needs_review: true`
5. 写入成功后建议用户继续探索关联知识
