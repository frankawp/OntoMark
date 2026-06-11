# OntoMark LLM-Wiki 架构设计

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 OntoMark 从"原地增强"架构转变为 llm-wiki 三层架构，实现 raw sources → wiki 的知识编译流程。

**Architecture:** 三层架构（raw sources 不可变 → wiki 知识库 → schema 指导），两阶段处理（extract + link），实体页面扁平结构 + 索引文件。

**Tech Stack:** TypeScript, gray-matter, yaml, LLM Provider (DeepSeek/OpenAI)

---

## 一、整体架构

```
MultiHop Raw Sources (609篇新闻文章，不可变)
           ↓
     [Extract Phase]
    识别实体、提取信息、生成页面
           ↓
    ┌─────────────────┐
    │     wiki/       │  ← 初始 wiki 页面（无链接）
    └─────────────────┘
           ↓
     [Link Phase]
    wiki 内部实体链接
           ↓
    ┌─────────────────┐
    │     wiki/       │  ← 最终 wiki（带链接）
    │  ├── index.md   │
    │  ├── FTX.md     │  "... [[Sam Bankman-Fried]] ..."
    │  ├── Sam_Bankman-Fried.md
    │  └── ...        │
    └─────────────────┘
           ↓
    ┌─────────────────┐
    │  ontology.yaml  │  ← Schema（实体类型 + 页面模板）
    └─────────────────┘
```

**核心变化：**
1. **输入输出分离** — raw/ 不可变，OntoMark 只读取不修改
2. **生成而非增强** — 输出到独立的 wiki/ 目录，生成新页面
3. **页面即实体** — 每个识别出的实体对应一个 wiki 页面
4. **两阶段处理** — Extract Phase（信息提取）+ Link Phase（实体链接）

---

## 二、ontology.yaml 结构

```yaml
version: "1.0"

# 实体类型定义（通用粒度）
entity_types:
  Person:
    description: 人物
    template:
      summary: "一句话简介"
      info:
        - key: "职业/身份"
        - key: "所属组织"
        - key: "知名事件"
      sources: "来源链接列表"
      related: "相关实体"
      updated: "更新时间"
  
  Organization:
    description: 组织、公司、机构
    template:
      summary: "一句话简介"
      info:
        - key: "行业"
        - key: "总部"
        - key: "关键人物"
        - key: "关键事件"
      sources: "来源链接列表"
      related: "相关实体"
      updated: "更新时间"
  
  Event:
    description: 事件
    template:
      summary: "一句话简介"
      info:
        - key: "时间"
        - key: "地点"
        - key: "关键人物"
        - key: "影响"
      sources: "来源链接列表"
      related: "相关实体"
      updated: "更新时间"
  
  Concept:
    description: 概念、技术、产品
    template:
      summary: "一句话简介"
      info:
        - key: "领域"
        - key: "相关组织"
        - key: "关键人物"
      sources: "来源链接列表"
      related: "相关实体"
      updated: "更新时间"
  
  Product:
    description: 产品
    template:
      summary: "一句话简介"
      info:
        - key: "类型"
        - key: "开发/生产者"
        - key: "发布时间"
      sources: "来源链接列表"
      related: "相关实体"
      updated: "更新时间"

# 关系定义（用于链接生成）
relations:
  founded:
    from: Person
    to: Organization
  works_for:
    from: Person
    to: Organization
  involved_in:
    from: Person
    to: Event
  related_to:
    from: Concept
    to: Organization
```

---

## 三、目录结构

```
project/
├── raw/                           # MultiHop 原始文档（不可变）
│   ├── technology/
│   │   ├── The_FTX_trial_is_bigger_than_Sam_Bankman-Fried.md
│   │   └── ...
│   ├── business/
│   ├── entertainment/
│   └── sports/
│
├── wiki/                          # LLM 生成的知识库
│   ├── index.md                   # 索引文件
│   ├── FTX.md                     # 实体页面（扁平结构）
│   ├── Sam_Bankman-Fried.md
│   ├── cryptocurrency.md
│   └── ...
│
├── .ontomark/                     # OntoMark 元数据
│   ├── cache.json                 # 增量处理缓存
│   └── entity_index.json          # 实体索引
│
└── ontology.yaml                  # Schema 定义
```

### wiki/index.md 结构

```markdown
# Wiki Index

> 最后更新：2026-06-11

## Person (12)

- [[Sam Bankman-Fried]] — FTX 创始人，因欺诈罪受审
- [[Caroline Ellison]] — Alameda Research 前 CEO
- ...

## Organization (8)

- [[FTX]] — 加密货币交易所，2022年破产
- [[Alameda Research]] — 加密货币交易公司
- ...

## Event (5)

- [[FTX Trial]] — 2023年针对 SBF 的刑事审判
- ...

## Concept (10)

- [[cryptocurrency]] — 加密货币
- ...
```

### 实体页面命名规则

- 使用实体名作为文件名（如 `FTX.md`）
- 空格替换为下划线（如 `Sam_Bankman-Fried.md`）
- 特殊字符移除（如 `Coinbase's → Coinbases`）

---

## 四、处理流程

### Extract Phase（信息提取）

**输入：** `raw/**/*.md`（源文档）
**输出：** `wiki/*.md`（实体页面，无链接）

**步骤：**

1. **扫描 raw/** — 遍历所有源文档
2. **实体识别** — 对每个源文档，LLM 识别其中的实体
   - 输入：文档内容 + ontology.yaml 的 entity_types
   - 输出：实体列表 `[{"name": "FTX", "type": "Organization", "mentions": [...]}]`
3. **实体归并** — 合并同一实体的信息
   - "FTX" 出现在 article1.md、article3.md、article5.md
   - 合并为一个 FTX.md，汇总所有相关信息
4. **页面生成** — 按 ontology.yaml 的模板生成 wiki 页面
   - summary：LLM 综合所有来源生成
   - info：从各来源提取关键信息
   - sources：列出所有源文档链接
5. **索引更新** — 更新 wiki/index.md

### Link Phase（实体链接）

**输入：** `wiki/*.md`（实体页面，无链接）
**输出：** `wiki/*.md`（实体页面，带 `[[Wiki Links]]`）

**步骤：**

1. **构建实体索引** — 扫描 wiki/，构建实体名 → 文件路径的映射
2. **实体链接** — 对每个 wiki 页面：
   - 识别页面内容中的实体提及
   - 匹配到已有的 wiki 页面（同时检查 canonical name 和 aliases）
   - 生成 `[[Entity Name]]` 链接
3. **冲突处理** — 如果匹配到多个候选，报错让用户处理

### 增量处理机制

使用 MD5 hash 追踪：
- raw 文档 hash → 哪些源文档已处理
- wiki 页面 hash → 哪些 wiki 页面需要更新
- ontology.yaml hash → schema 变化时重新处理

---

## 五、CLI 命令与 SDK API

### CLI 命令

```bash
# 构建索引
ontomark index <vault-path>

# 信息提取阶段
ontomark extract <vault-path>

# 实体链接阶段
ontomark link <vault-path>

# 一键执行完整流程
ontomark build <vault-path>

# 查看状态
ontomark status <vault-path>

# 单个实体页面操作
ontomark enhance wiki/FTX.md
```

### SDK API

```typescript
const ontomark = new OntoMark({
  rawPath: './raw',       // 源文档目录
  wikiPath: './wiki',     // wiki 输出目录
  llmProvider,
  schemaPath: './ontology.yaml',
});

// 执行完整流程
await ontomark.build();

// 或分步执行
await ontomark.extract();   // 提取阶段
await ontomark.link();      // 链接阶段

// 查看状态
const status = await ontomark.getStatus();

// 单个页面操作
await ontomark.extractEntity('FTX');
await ontomark.linkPage('wiki/FTX.md');
```

---

## 六、错误处理与边界情况

### 实体归并策略

同一实体可能有不同名称（"SBF"、"Sam Bankman-Fried"、"Bankman-Fried"）：

1. LLM 识别时输出 `canonical_name` 和 `aliases`
2. 归并时使用 `canonical_name` 作为页面名
3. `aliases` 存储在 wiki 页面的 frontmatter 中
4. 链接阶段：匹配时同时检查 canonical name 和 aliases

```yaml
# wiki/Sam_Bankman-Fried.md frontmatter
---
name: Sam Bankman-Fried
aliases:
  - SBF
  - Bankman-Fried
type: Person
---
```

### 冲突处理

**实体类型冲突：**
- 文章 A 认定 "FTX" 是 Organization
- 文章 B 认定 "FTX" 是 Event
- **处理：** 使用首次出现的类型，在 info 中记录争议

**信息矛盾：**
- 文章 A 说 X 公司有 100 人
- 文章 B 说 X 公司有 200 人
- **处理：** LLM 在 summary 中标注矛盾

**链接多匹配：**
- 文本 "苹果" 可能匹配多个实体
- **处理：** 抛出 ConflictError，停止处理，用户手动解决

### 增量更新

**新增源文档：** 仅处理新文档，更新相关 wiki 页面

**ontology.yaml 变更：** schema hash 变化 → 重新 extract 所有 → 重新 link

---

## 七、复用现有代码

以下组件可完全复用，仅改变应用对象：

| 组件 | 原用途 | 新用途 |
|------|--------|--------|
| EntityRecognizer | 识别 raw 文档中的实体 | 识别 wiki 页面中的实体 |
| EntityResolver | 匹配 raw 文件名 | 匹配 wiki 实体名 + aliases |
| EntityLinker | 生成 [[Wiki Links]] | 不变 |
| HashCache | 追踪 raw 文档处理 | 追踪 raw + wiki 处理 |

新增组件：
- EntityExtractor：从 raw 提取实体信息，生成 wiki 页面
- WikiIndexBuilder：维护 wiki/index.md
- EntityMerger：合并同一实体的多源信息