---
name: ontomark-ingest
description: 从 raw 文档提取实体并写入 wiki 知识库。当用户说"处理/添加/导入/ingest"时由 ontomark 主技能分发。
---

# Ingest 工作流

> 从原始文档提取实体，写入知识库。

> **注意：** 输入目录和输出目录由 init 阶段配置，存储在 `.ontomark/config.json` 中。
> 执行 Ingest 前应先读取该配置，获取输入目录列表 `inputDirs` 和输出目录 `outputDir`。
> 默认配置为：inputDirs=`["raw"]`, outputDir=`"wiki"`。

## 触发条件

- 用户输入：`/ontomark` + 含有"处理/添加/导入"等关键词
- 或显式调用：`/ontomark-ingest [文件路径]`
- 或由 `/ontomark` 主技能分发

## CLI 调用方式

```bash
ontomark <command> <project-path>
```

### 状态查询

```bash
# 获取待处理文件
ontomark raw-status <project-path> [--modified <true|false|all>] [--limit <number>]
# --modified: true=待处理(默认), false=已处理, all=全部
# --limit: 返回文件数限制(默认10, 0=全部)
# 返回: { files: [{path, hash, modified}], total, pending, ontologyChanged }
```

**增量处理机制**：
- `ontologyChanged: true` → ontology.md 已变化，所有文件需重新处理
- `pending` → 需要处理的文件数量
- 文件内容变化时 `modified: true`

### 写入实体页面

使用 Write 工具直接写入 Markdown 文件到输出目录。每类实体按类型分目录存放。

**文件路径格式**：
```
{outputDir}/{EntityType}/{CanonicalName}.md
```

例如 `outputDir` 为 `wiki`、类型为 `Person` 的实体：
```
wiki/Persons/John_Doe.md
```

**Markdown 文件格式**（YAML frontmatter + 正文）：

```markdown
---
canonical: 规范名称
entity_type: Person
aliases: [别名1, 别名2]
sources:
  - file: raw/article.md
status: canonical
last_updated: 2026-06-25
info:
  role: 工程师
  organization: 某公司
---

# 规范名称

实体的描述内容...

## 关键信息

| 字段 | 值 |
| --- | --- |
| role | 工程师 |

## 来源

- [[原始文档名]]
```

**frontmatter 字段说明**：

| 字段 | 必填 | 说明 |
|------|------|------|
| `canonical` | 是 | 实体的规范名称 |
| `entity_type` | 是 | 知识维度（必须存在于 ontology.md） |
| `aliases` | 否 | 别名列表 |
| `sources` | 是 | 来源文件列表 |
| `status` | 否 | `canonical` 或 `draft` |
| `last_updated` | 否 | 更新日期 |
| `info` | 否 | 关键信息键值对 |
| `needs_review` | 否 | 设为 `true` 表示需人工审核 |

**规则**：
1. 写入前先 Read 检查文件是否已存在
2. 已存在的文件 → 合并 aliases、追加 sources 和 content
3. 新建的文件 → 生成完整 frontmatter + 正文
4. 所有知识维度必须来自 `ontology.md`

### 其他命令

```bash
# 标记文件已处理
ontomark mark-processed <project-path> <file-path>

# 构建索引
ontomark index-build <project-path>

# 查询实体
ontomark index-query <project-path> <name> [--fuzzy]
```

## 工作流程

### 第一步：获取上下文

1. **读取 `ontology.md`** → 获取可用知识维度（直接 Read 文件；如不存在，提示用户先运行 /ontomark-init）
2. 调用 `raw-status` → 获取待处理文件列表
3. 选择一个待处理文件（用户指定或按顺序）

### 第二步：读取文档

4. Read → 读取 raw 文档内容

### 第三步：多层实体提取

参考 [entity-extraction.md](reference/entity-extraction.md) 执行实体提取：

**第一层：直接识别** — 扫描文档，识别明确提到的实体名称
**第二层：上下文推断** — 分析段落上下文，推断隐含实体
**第三层：全局总结** — 总结文档主题，提取概念性实体

### 第四步：处理 WikiLinks

参考 [wikilinks-annotation.md](reference/wikilinks-annotation.md) 标注实体引用：

5. 调用 `index-query` → 检查每个实体是否已存在
6. 对提取的 content 进行 WikiLinks 标注：
   - 将实体名称替换为 `[[canonical]]`
   - 别名映射到规范名称

### 第五步：写入 wiki

7. 使用 Write 工具写入实体页面（参考上方"写入实体页面"的格式规范）
   - 新建：`isUpdate: false`，生成完整 frontmatter
   - 更新：`isUpdate: true`，合并 aliases、追加 sources 和 content
   - sources 使用格式：`[{"file": "raw/file.md"}]`
8. 确认写入成功（Read 验证文件内容）
9. 调用 `mark-processed` → 标记文件已处理
10. 调用 `index-build` → 重建索引

## 错误处理

- **类型不存在**：CLI 返回错误包含可用类型列表
- **实体已存在**：CLI 返回错误提示使用 `isUpdate: true`
- **实体不存在却要更新**：CLI 返回错误提示使用 `isUpdate: false`
- **文件已处理**：跳过或询问是否强制重处理

冲突处理参考 [conflict-resolution.md](reference/conflict-resolution.md)。

## 输出报告

```markdown
## Ingest 完成

- 文件：raw/article.md
- 提取实体：X 个
  - 直接识别：X 个
  - 上下文推断：X 个
  - 全局总结：X 个
- 新建页面：X 个
- 更新页面：X 个
```
