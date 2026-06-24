---
name: ontomark-init
description: 初始化 OntoMark 项目结构（创建 raw/、wiki/、.ontomark/ 目录）
---

# Init 工作流

> 初始化 OntoMark 项目结构。

## 触发条件

- 用户输入：`/ontomark` + 含有"初始化/创建项目/init"等关键词
- 或显式调用：`/ontomark-init`
- 或 `/ontomark init`

## 工作流程

### 第一步：确认项目路径

```
1. 询问用户项目路径（默认当前目录）
```

### 第二步：执行初始化

```
2. 运行 CLI 命令：
   ontomark init [project-path]

   创建以下目录：
   - raw/       — 源文档目录
   - wiki/      — 知识库输出目录
   - .ontomark/ — 内部状态目录
```

### 第三步：输出指引

```
3. 向用户展示结果，引导下一步操作：
   - 将文档放入 raw/ 目录
   - 运行 /ontomark-ingest 提取实体
```

## 注意事项

- `ontology.yaml` 不需要手动创建，Ingest 第一次执行时会根据文档内容动态推荐
- 项目需在 git 仓库中，否则后续 ingest 无法工作
