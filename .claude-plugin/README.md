# OntoMark Plugin

将文档转化为持久化知识库。基于知识图谱的文档管理和查询工具。

## 技能

| 技能 | 触发 | 功能 |
|------|------|------|
| `/ontomark` | 入口技能 | 识别意图并分发到对应工作流 |
| `/ontomark-ingest` | 处理/导入文档 | 从 raw 文档提取实体，写入 wiki |
| `/ontomark-query` | 查询知识 | 查询 wiki 知识，生成回答 |
| `/ontomark-lint` | 健康检查 | 检查 wiki 健康状态，建议修复 |

## 工作流概览

```
用户输入 → ontomark (意图识别)
             ├→ ontomark-ingest: raw → 实体提取 → wiki 写入
             ├→ ontomark-query: 问题 → wiki 查询 → 回答
             └→ ontomark-lint: 检查 → 报告 → 修复
```

## 开发

技能文件位于 `skills/{skill-name}/SKILL.md`。参考文档位于 `references/`。
