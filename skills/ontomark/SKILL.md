---
name: ontomark
description: OntoMark 知识库入口技能。当用户提到知识库、wiki、本体、实体、文档处理/导入/查询时触发。根据意图分发到子技能。
---

# OntoMark 入口技能

> 将文档转化为持久化知识库。入口：`/ontomark`

## CLI检查

在执行任何操作前，技能必须检查 `ontomark` CLI 是否已安装并可在当前环境中调用。如果没有安装，提示用户安装指南：
```bash
# 从项目根目录
./scripts/install-skill.sh
```

## 意图识别

根据用户输入判断工作流，分发到对应子技能：

| 关键词模式 | 工作流 | 子技能 |
|-----------|--------|--------|
| 初始化/init/创建项目/设置 | Init | 调用 Skill: `ontomark-init` |
| 处理/添加/导入/ingest | Ingest | 调用 Skill: `ontomark-ingest` |
| 谁/什么/查询/query/列出 | Query | 调用 Skill: `ontomark-query` |
| 检查/lint/健康/孤立 | Lint | 调用 Skill: `ontomark-lint` |
| explore/探索/知识点/搜索/了解 | Explore | 调用 Skill: `ontomark-explore` |

## 分发规则

1. **检测到意图后，调用 Skill tool 执行对应子技能**
2. 如果用户未明确指定路径，使用当前项目目录作为 project-path
3. 如果用户输入模糊（同时匹配多个工作流），询问用户确认
4. 如果用户输入不匹配任何工作流，提示支持的功能列表

## 强制规则

所有子技能共享以下规则：

1. **先读后写** — 使用 Write 工具写入实体页面之前，必须先 Read 现有文件或通过 index-query 查询实体状态
2. **类型来源** — 所有实体类型从 `ontology.md` 读取，不硬编码
3. **来源追溯** — 每个实体必须记录 sources
4. **WikiLinks 由 LLM 标注** — CLI 不处理语义标注

## CLI 工具参考

调用方式：`ontomark <command> <project-path>`

各子技能文档的 CLI 参考表格列出了实际存在的命令及其输出格式。
