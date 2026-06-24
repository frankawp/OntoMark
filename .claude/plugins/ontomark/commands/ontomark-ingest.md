---
description: 从 raw 文档提取实体，写入 wiki 知识库
allowed-tools: Read, Bash, Write
---

# /ontomark-ingest

从 raw 文档提取实体，写入 wiki。

## CLI检查

在执行任何操作前，检查 `ontomark` CLI 是否已安装并可在当前环境中调用。如果没有安装，提示用户 `npm install -g ontomark`。

## 工作流程

### 第一步：获取上下文

1. 调用 `ontomark ontology-status <project-path>` → 获取可用实体类型
   - 如果 ontology.yaml 不存在：
     - 扫描 raw/ 目录内容
     - 询问用户知识库的适用场景
     - 基于 ontology.yaml 样例给出本体设计建议
     - 用户确认后写入 ontology.yaml
2. 调用 `ontomark pending-files <project-path>` → 获取待处理文件列表
3. 选择一个待处理文件（用户指定或按顺序）

### 第二步：读取文档

4. Read → 读取 raw 文档内容

### 第三步：多层实体提取

参考 entity-extraction.md 执行实体提取：

**第一层：直接识别** — 扫描文档，识别明确提到的实体名称
**第二层：上下文推断** — 分析段落上下文，推断隐含实体
**第三层：全局总结** — 总结文档主题，提取概念性实体

### 第四步：处理 WikiLinks

参考 wikilinks-annotation.md 标注实体引用：
5. 调用 `ontomark index-query <path> <name>` → 检查每个实体是否已存在
6. 对提取的 content 进行 WikiLinks 标注

### 第五步：写入 wiki

7. 调用 `ontomark wiki-write <project-path>` → 批量写入所有实体
8. 检查返回结果中的 failed 项
9. 调用 `ontomark mark-processed <project-path>` → 标记文件已处理
10. 调用 `ontomark index-build <project-path>` → 重建索引

## 错误处理

- **类型不存在**：CLI 返回错误包含可用类型列表
- **实体已存在**：CLI 返回错误提示使用 `isUpdate: true`
- **实体不存在却要更新**：CLI 返回错误提示使用 `isUpdate: false`
- **文件已处理**：跳过或询问是否强制重处理

## 输出报告

```markdown
## Ingest 完成

- 文件：raw/article.md
- 提取实体：X 个（直接识别 X / 上下文推断 X / 全局总结 X）
- 新建页面：X 个
- 更新页面：X 个
```
