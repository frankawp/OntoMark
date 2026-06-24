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
# 获取可用实体类型
ontomark ontology-status <project-path>
# 返回: { exists, path, entityTypes: { Person: {...}, Organization: {...}, ... } }

# 获取待处理文件
ontomark raw-status <project-path> [--modified <true|false|all>] [--limit <number>]
# --modified: true=待处理(默认), false=已处理, all=全部
# --limit: 返回文件数限制(默认10, 0=全部)
# 返回: { files: [{path, hash, modified}], total, pending, ontologyChanged }
```

**增量处理机制**：
- `ontologyChanged: true` → ontology.yaml 已变化，所有文件需重新处理
- `pending` → 需要处理的文件数量
- 文件内容变化时 `modified: true`

### Wiki 写入

```bash
# 批量写入（推荐）
ontomark wiki-write <project-path> --file entities.json
ontomark wiki-write <project-path> --entities '[...]'

# 单个写入
ontomark wiki-write <project-path> \
  --canonical "实体名称" \
  --type "Person" \
  --content "实体描述内容" \
  --sources '["raw/file.md"]' \
  --is-update false
```

**实体格式**：
```typescript
interface WikiWriteEntity {
  canonical: string;        // 规范名称（必需）
  type: string;              // 实体类型（必需，必须存在于 ontology）
  content: string;           // 实体描述内容（必需）
  sources: SourceRef[];      // 来源（必需）
  aliases?: string[];        // 别名
  info?: Record<string, string>;  // 关键信息
  needsReview?: boolean;     // 是否需审核
  isUpdate: boolean;         // true=更新, false=新建
}

type SourceRef = string | { file: string; lines?: number[] };
```

**返回结果**：
```typescript
interface WikiWriteResult {
  total: number;      // 总数
  created: number;    // 新建数
  updated: number;    // 更新数
  failed: number;     // 失败数
  results: WikiWriteItemResult[];
}
```

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

1. 调用 `ontology-status` → 获取可用实体类型（如不存在，提示用户先运行 /ontomark-init）
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

7. 调用 `wiki-write` → 批量写入所有实体
   - 使用 `--file` 或 `--entities` 参数
   - `isUpdate: false`（新建）或 `true`（更新）
   - sources 使用字符串格式：`["raw/file.md"]`
8. 检查返回结果中的 failed 项
   - 成功：`action = 'created'` 或 `'updated'`
   - 失败：`error` 包含友好提示
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
