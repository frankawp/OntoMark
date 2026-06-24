---
name: ontomark-init
description: 初始化 OntoMark 知识库项目结构。当用户说"初始化/init/创建项目"时由 ontomark 主技能分发。
---

# Init 工作流

> 初始化 OntoMark 知识库项目结构，支持灵活的输入/输出目录配置。

## 触发条件

- 用户输入：`/ontomark` + 含有"初始化/init/创建项目/设置/配置"等关键词
- 或显式调用：`/ontomark-init [项目路径]`
- 或由 `/ontomark` 主技能分发

## 配置说明

OntoMark 支持灵活配置输入和输出目录。配置存储在 `.ontomark/config.json` 中，由 init 工作流管理。

### 配置格式

`.ontomark/config.json`：

```json
{
  "version": "1.0",
  "inputDirs": ["raw", "codebase"],
  "outputDir": "wiki"
}
```

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `inputDirs` | 输入源目录列表（可多个），Ingest 从这些目录读取文档 | `["raw"]` |
| `outputDir` | 输出目录（仅一个），Ingest 生成的实体页面写入此目录 | `"wiki"` |

> `ontology.md` 固定存放在项目根目录，无需在配置中声明。

### 输入目录（inputDirs）

可以有多个输入目录，每个目录下的 `.md` 文件都会被 Ingest 处理。例如：

```
project/
├── raw/docs/          # 文章文档
├── codebase/           # 代码文档
├── pdf/notes/          # PDF 笔记
└── research/           # 研究笔记
```

Ingest 会扫描所有输入目录，合并输出到一个输出目录。

### 输出目录（outputDir）

只有一个输出目录，Ingest 写入的实体页面都放在这里：

```
project/
├── wiki/               # 实体分类目录
│   ├── Persons/
│   ├── Organizations/
│   └── Events/
└── output/             # 或自定义
    └── wiki/
```

### 典型场景示例

| 场景 | inputDirs | outputDir | 说明 |
|------|-----------|-----------|------|
| 简单项目 | `["raw"]` | `"wiki"` | 默认，raw 输入 wiki 输出 |
| 多源输入 | `["raw/docs", "codebase", "pdf"]` | `"output/wiki"` | 多源合并到一个 wiki |
| 嵌套输出 | `["articles"]` | `"output"` | 实体直接在 output/ 下按类型分目录 |
| 深入分析 | `["raw/articles", "raw/interviews"]` | `"research/wiki"` | 分离输入源，独立输出 |

## 工作流程

### 第一步：读取当前状态

1. 检查目标目录是否已有 `.ontomark/` 目录
2. 读取 `.ontomark/config.json`（如存在），获取当前配置
3. 显示当前配置摘要：

   ```
   📋 当前 OntoMark 配置

   项目路径：/path/to/project

   输入目录（2 个）：
     📂 raw/          → 36 个文件
     📂 codebase/     → 12 个文件

   输出目录：
     📂 wiki/         → 128 个实体页面

   知识维度：4 个（Actor, Event, Thing, Place）
   ```

### 第二步：询问用户意图

4. 询问用户想要做什么：

   ```
   请选择操作：
   A. 全新初始化（覆盖现有配置）
   B. 调整现有配置（保留数据）
   C. 查看当前状态（不修改）
   ```

### 第三步：配置输入目录

5. 让用户配置输入目录：

   ```
   输入目录指放置原始文档的位置，Ingest 会从这些目录读取文件。

   当前输入目录：["raw", "codebase"]

   请指定新的输入目录（多个用逗号分隔，输入 . 跳过）：
   > raw/docs, codebase, pdf/notes

   确认：将使用以下输入目录
   📂 raw/docs/
   📂 codebase/
   📂 pdf/notes/

   会在项目中创建不存在的目录。
   ```

   - 如果用户跳过（`.`），保持现有配置
   - 绝对路径和相对路径都支持，相对路径相对于项目根目录
   - 不存在的目录会被创建

### 第四步：配置输出目录

6. 让用户配置输出目录：

   ```
   输出目录指实体页面的写入位置，Ingest 会在这里生成所有实体。

   当前输出目录：wiki

   请指定新的输出目录（输入 . 跳过）：
   > output/wiki

   确认：将使用输出目录 📂 output/wiki/
   ```

### 第五步：本体设计引导（AI 扫描建议 → 用户交互修改）

7. 如果 `ontology.md` 不存在或用户同意重新设计：

   **① 扫描输入目录（了解内容）**
   - 扫描输入目录下的现有文档，分析：
     - 文档主题领域（新闻？技术？学术？）
     - 反复出现的概念类型（人物？事件？产品？）
     - 文档中呈现的知识密度
   - 读取 `reference/ontology.md` 的框架维度模板

   **② AI 建议骨架**
   - 根据扫描结果，推荐适合的维度组合：
     ```
     根据文档内容，建议以下知识维度：

     📋 Actor / 行动者（粒度：标准）
        → 文档中出现大量人物和组织
        → 属性：角色/职位、所属组织

     📋 Event / 事件（粒度：详细）
        → 文档按时间线组织，事件密集
        → 属性：时间、地点、参与方、结果

     📋 Thing / 事物（粒度：标准）
        → 涉及多个产品和技术概念
        → 属性：类型、用途、开发者

     📋 Place / 地点（粒度：粗略）
        → 部分文档涉及地理位置
        → 属性：类型
     ```

   **③ 用户交互修改**
   ```
   你的知识库将使用以上知识维度。
   你可以：
   A. 接受全部建议
   B. 修改后接受（增删维度、调粒度、改属性）
   C. 从模板重新选择
   D. 自由定义（自定义所有维度）

   ❓ 选择：B

   请指定要修改的内容：
   - 删除哪个维度？→ Place（不需要地点）
   - 调整粒度？→ Thing 改为"粗略"
   - 修改属性？→ Actor 增加"联系方式"
   ```

   **④ 写入 ontology.md**
   - 用户确认最终版本后写入项目根目录

### 第六步：创建目录和写入配置

8. 使用 Bash（mkdir）创建必要的目录：

   ```
   # 创建 .ontomark/ 目录
   mkdir -p /path/to/project/.ontomark

   # 创建所有输入目录
   mkdir -p /path/to/project/raw/docs
   mkdir -p /path/to/project/codebase
   mkdir -p /path/to/project/pdf/notes

   # 创建输出目录
   mkdir -p /path/to/project/output/wiki
   ```

9. 使用 Write 写入 `.ontomark/config.json`：

   ```json
   {
     "version": "1.0",
     "inputDirs": ["raw/docs", "codebase", "pdf/notes"],
     "outputDir": "output/wiki"
   }
   ```

   > `ontology.md` 始终放在项目根目录，由 init 工作流直接写入，无需在 config 中声明。

### 第七步：下一步指引

10. 输出初始化完成信息：

   ```markdown
   ✅ OntoMark 知识库初始化完成！

   项目路径：/path/to/project

   配置：
   📥 输入目录（3 个）：
      • raw/docs/
      • codebase/
      • pdf/notes/
   📤 输出目录：output/wiki/
   📋 知识维度：4 个（Actor, Event, Thing, Place）

   目录状态：
   📂 raw/docs/       → 已就绪
   📂 codebase/       → 已就绪
   📂 pdf/notes/      → 新目录（请放入文件）
   📂 output/wiki/    → 已就绪

   下一步：
   1. 将文档放入输入目录
   2. 运行 /ontomark ingest 提取实体
   3. 运行 /ontomark query 查询知识
   4. 运行 /ontomark init 随时调整配置
   ```

## 再次运行（调整配置）

当项目已初始化，再次运行 `/ontomark-init` 时的流程：

### 第一步：展示当前配置

```
📋 当前 OntoMark 配置

项目路径：/path/to/project

输入目录（2 个）：
  📂 raw/          → 36 个文件，最后处理 2026-06-24
  📂 codebase/     → 12 个文件（新目录，尚未处理）

输出目录：
  📂 wiki/         → 128 个实体页面

知识维度：4 个（Actor, Event, Thing, Place）
上次索引更新：2026-06-24 15:30:00
```

### 第二步：调整选项

```
请选择要调整的内容（可多选）：
A. 调整输入目录
B. 调整输出目录
C. 重新设计本体（ontology.md）
D. 全部重新初始化（⚠️ 清除现有数据）
E. 完成，无需修改

❓ 选择：A, B
```

### 第三步：增量调整

**调整输入目录**：
```
当前输入目录：["raw", "codebase"]

请选择操作：
1. 添加输入目录
2. 移除输入目录
3. 全部替换
4. 取消

❓ 选择：1
请输入要添加的目录：research/
添加后：["raw", "codebase", "research"]
```

**调整输出目录**：
```
当前输出目录：wiki

⚠️ 调整输出目录不会移动现有实体页面，
   Ingest 写入时会在新位置生成页面。

是否继续？(y/N)
请输入新的输出目录：output/wiki
```

### 第四步：保存并生效

使用 Bash 创建新目录，Write 更新 `.ontomark/config.json`：

```
配置已更新：
├─ inputDirs:  ["raw", "codebase", "research"]
└─ outputDir:  "output/wiki"

✅ 配置已保存到 .ontomark/config.json
📂 research/    → 已创建
📂 output/wiki/ → 已创建
```

## 本体设计参考

完整的框架维度模板参考 [reference/ontology.md](reference/ontology.md)，包含维度定义、粒度说明和关联关系。AI 在 init 阶段会根据扫描结果从中推荐骨架，用户交互确认后生成专属的 ontology.md。

## 注意事项

1. **输入目录变更**：新增目录的文档会自动进入 Ingest 队列；移除目录不删除已有实体
2. **输出目录变更**：不会迁移已有实体页面，新写入在目标位置生成
3. **重新初始化**：选择"全部重新初始化"会清空 `.ontomark/` 配置但不删除 wiki 内容

## 输出报告

```markdown
## 初始化完成

项目路径：/path/to/project

配置：
📥 输入目录（3 个）：
   • raw/docs/
   • codebase/
   • pdf/notes/
📤 输出目录：output/wiki/
📋 知识维度：4 个（Actor, Event, Thing, Place）

下一步：
1. 将文档放入输入目录
2. 运行 /ontomark ingest 提取实体
3. 运行 /ontomark query 查询知识
```
