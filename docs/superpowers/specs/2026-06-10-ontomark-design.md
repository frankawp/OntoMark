# OntoMark 设计文档

## 概述

OntoMark 是一个 Ontology-Aware Markdown Enhancer，根据用户定义的本体 Schema，对 Markdown 文档进行自动知识增强，输出标准 Markdown 文件，完全兼容 Obsidian 原生能力。

## 核心决策

| 维度 | 决策 |
|------|------|
| 实现形态 | 混合方案（SDK + CLI），可集成到 AI Agent |
| 技术栈 | TypeScript/Node.js |
| LLM 集成 | 由调用方提供，SDK 不内置 |
| 处理粒度 | 批量 + 单文件，都支持增量机制 |
| 增量机制 | MD5 hash（ontology.yaml + 文件内容）存储在 .ontomark/ |
| Schema 位置 | 多位置查找，优先 ontology.yaml |
| 冲突处理 | 单文件返回结构化错误，批量立即停止 |
| 关系抽取 | 不存储不标注，relations 保留在 Schema 作为扩展 |

---

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                             │
│  ontomark index | ontomark enhance | ontomark enhance-all   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        SDK Layer                             │
│  OntoMark class: index(), enhance(file), enhanceAll()       │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Schema Loader  │  │  Entity Index   │  │   Enhancer      │
│                 │  │                 │  │                 │
│  - load YAML    │  │  - scan vault   │  │  - recognize    │
│  - validate     │  │  - build index  │  │  - resolve      │
│  - default      │  │  - cache hash   │  │  - link         │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
                    ┌─────────────────┐
                    │  LLM Provider   │
                    │  (由调用方提供)  │
                    └─────────────────┘
```

**核心模块职责：**

| 模块 | 职责 |
|------|------|
| SchemaLoader | 加载并验证本体定义，内置默认 Schema |
| EntityIndex | 扫描 Vault，构建内存实体索引，管理 hash 缓存 |
| Enhancer | 实体识别、对齐、链接，输出增强后的 Markdown |
| LLMProvider | 抽象接口，由调用方实现，用于实体识别 |

**目录结构：**

```
ontomark/
├── src/
│   ├── index.ts              # SDK 入口
│   ├── cli.ts                # CLI 入口
│   ├── schema/
│   │   ├── loader.ts         # Schema 加载器
│   │   ├── default.ts        # 默认 Schema 定义
│   │   └── types.ts          # Schema 类型定义
│   ├── index/
│   │   ├── scanner.ts        # 文件扫描器
│   │   ├── entity-index.ts   # 实体索引构建
│   │   ├── hash-cache.ts     # MD5 hash 缓存管理
│   │   └── types.ts          # 索引类型定义
│   ├── enhance/
│   │   ├── recognizer.ts     # 实体识别
│   │   ├── resolver.ts       # 实体对齐
│   │   ├── linker.ts         # 实体链接
│   │   ├── frontmatter.ts    # Frontmatter 处理
│   │   └── types.ts          # 增强类型定义
│   ├── llm/
│   │   └── types.ts          # LLM Provider 接口定义
│   └── utils/
│       ├── md5.ts            # MD5 工具函数
│       └── path.ts           # 路径工具函数
├── package.json
├── tsconfig.json
└── .ontomark/
    └── cache.json            # 运行时缓存（gitignored）
```

---

## Schema 定义

**Schema 文件格式（YAML）：**

```yaml
version: "1.0"
entity_types:
  Concept:
    description: 技术概念
  System:
    description: 系统
  Component:
    description: 组件
  ADR:
    description: 架构决策
  Requirement:
    description: 需求
  Incident:
    description: 故障事件
  Team:
    description: 团队
  Person:
    description: 人员
  Project:
    description: 项目

relations:
  uses:
    from: System
    to: Concept
  implements:
    from: Component
    to: Concept
  owns:
    from: Team
    to: System
  affects:
    from: Incident
    to: System
```

**TypeScript 类型定义：**

```typescript
interface OntologySchema {
  version: string;
  entity_types: Record<string, EntityTypeDefinition>;
  relations: Record<string, RelationDefinition>;
}

interface EntityTypeDefinition {
  description: string;
}

interface RelationDefinition {
  from: string;
  to: string;
}
```

**Schema 加载逻辑：**

```
查找顺序：
1. ./ontology.yaml
2. ./.ontomark/ontology.yaml
3. 使用内置默认 Schema

加载后验证：
- entity_types 不能为空
- relations 中引用的 entity_type 必须存在
- version 字段必填
```

---

## 实体索引

**索引数据结构：**

```typescript
interface EntityIndex {
  // 文件路径 -> 实体信息
  entities: Map<string, EntityInfo>;

  // 别名 -> 文件路径列表（用于冲突检测）
  aliasIndex: Map<string, string[]>;

  // 标题 -> 文件路径列表（用于 Heading 级别链接）
  headingIndex: Map<string, HeadingInfo>;

  // Block 引用 -> 文件路径
  blockIndex: Map<string, BlockInfo>;
}

interface EntityInfo {
  filePath: string;
  fileName: string;
  entityType?: string;
  aliases: string[];
  headings: string[];
  blocks: string[];
  fileHash: string;
}

interface HeadingInfo {
  filePath: string;
  heading: string;
  level: number;
}

interface BlockInfo {
  filePath: string;
  blockId: string;
}
```

**索引构建流程：**

```
1. 扫描 Vault 目录
   - 递归查找所有 .md 文件
   - 过滤 .ontomark/ 等隐藏目录

2. 解析每个文件
   - 提取文件名（作为主实体名）
   - 解析 frontmatter（tags、aliases）
   - 提取 headings（# 标题）
   - 提取 block references（^block-id）

3. 构建索引
   - entities: 文件路径 -> EntityInfo
   - aliasIndex: 别名 -> 文件路径[]
   - headingIndex: 标题 -> HeadingInfo
   - blockIndex: blockId -> BlockInfo

4. 缓存处理
   - 计算 ontology.yaml 的 MD5
   - 计算每个文件的 MD5
   - 对比 .ontomark/cache.json
   - 标记需要增强的文件
```

**缓存文件格式：**

```json
{
  "schemaHash": "a1b2c3d4e5f6...",
  "fileHashes": {
    "Concepts/JWT.md": {
      "fileHash": "abc123...",
      "combinedHash": "def456...",
      "enhanced": true
    }
  }
}
```

**增量判断逻辑：**

```typescript
function needsEnhancement(
  filePath: string,
  currentFileHash: string,
  cache: CacheData
): boolean {
  const cached = cache.fileHashes[filePath];

  if (!cached) return true;  // 新文件
  if (cached.fileHash !== currentFileHash) return true;  // 文件已修改

  const schemaHash = md5(readFile('ontology.yaml'));
  if (cache.schemaHash !== schemaHash) return true;  // Schema 已修改

  const combinedHash = md5(schemaHash + currentFileHash);
  if (cached.combinedHash !== combinedHash) return true;  // 组合变化

  return false;  // 无需重新增强
}
```

---

## 实体增强流程

**增强流程：**

```
输入文档
    │
    ▼
┌─────────────────┐
│ 1. 实体识别      │  ← 调用 LLM
│   (Recognizer)  │
└─────────────────┘
    │
    ▼ Candidate Entity
    │
┌─────────────────┐
│ 2. 实体对齐      │  ← 查询 EntityIndex
│   (Resolver)    │
└─────────────────┘
    │
    ▼ Resolved Entity
    │
┌─────────────────┐
│ 3. 冲突检测      │
│   (Conflict)    │
└─────────────────┘
    │
    ├── 有冲突 ──→ 抛出 ConflictError
    │
    ▼ 无冲突
┌─────────────────┐
│ 4. 实体链接      │  ← 生成 Wiki Link
│   (Linker)      │
└─────────────────┘
    │
    ▼ Enhanced Text
    │
┌─────────────────┐
│ 5. Frontmatter  │
│   增强          │  ← 更新 tags
└─────────────────┘
    │
    ▼
输出增强后的 Markdown
```

**匹配优先级：**

```typescript
function matchEntity(text: string, index: EntityIndex): MatchResult {
  // 1. 精确匹配文件名
  // 2. 别名匹配
  // 3. 标题匹配
  // 4. Block 引用匹配
  // 5. 无匹配，交给 LLM 判断
}
```

**实体链接生成：**

```typescript
function generateWikiLink(match: MatchResult): string {
  switch (match.type) {
    case 'document':
      return `[[${match.target.fileName}]]`;
    case 'alias':
      return `[[${match.target.fileName}|${match.original}]]`;
    case 'heading':
      return `[[${match.target.filePath}#${match.target.heading}]]`;
    case 'block':
      return `[[${match.target.filePath}#^${match.target.blockId}]]`;
    default:
      return match.text;
  }
}
```

---

## Frontmatter 处理

**处理规则：**

```
原文 frontmatter:
---
title: JWT 介绍
tags: [Security]
---

识别实体类型: Concept

增强后:
---
title: JWT 介绍
tags: [Security, Concept]
---

规则:
1. 保留所有现有字段
2. tags 若不存在则新增
3. tags 若存在则在末尾追加实体类型
4. 不重复添加已存在的标签
```

---

## 冲突处理与错误类型

**错误类型定义：**

```typescript
class OntoMarkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OntoMarkError';
  }
}

class SchemaError extends OntoMarkError {
  constructor(message: string, public filePath: string) {
    super(message);
    this.name = 'SchemaError';
  }
}

class ConflictError extends OntoMarkError {
  constructor(
    public conflictType: 'alias' | 'entity' | 'heading',
    public text: string,
    public candidates: ConflictCandidate[]
  ) {
    super(`冲突: "${text}" 匹配到多个实体`);
    this.name = 'ConflictError';
  }
}

interface ConflictCandidate {
  filePath: string;
  entityType?: string;
  matchType: 'document' | 'alias' | 'heading';
}
```

**批量处理时的错误处理：**

- 单文件处理：返回结构化错误信息，包含候选列表
- 批量处理：发现冲突立即停止，输出所有已发现的冲突信息

---

## CLI 与 SDK 接口

**CLI 命令：**

```bash
# 索引 Vault
ontomark index [vault-path]

# 增强单个文件
ontomark enhance <file-path> [options]

# 批量增强
ontomark enhance-all [vault-path] [options]

# 查看状态
ontomark status [vault-path]

# 选项
--dry-run          # 仅输出变更，不写入文件
--force            # 忽略缓存，强制重新处理
--schema <path>    # 指定 Schema 文件路径
--output <path>    # 输出目录
```

**SDK API：**

```typescript
import { OntoMark, LLMProvider } from 'ontomark';

const ontomark = new OntoMark({
  vaultPath: './notes',
  llmProvider: myLLMProvider,
  schemaPath?: './ontology.yaml',
});

// 构建索引
const index = await ontomark.buildIndex();

// 增强单个文件
const result = await ontomark.enhanceFile('Concepts/JWT.md');

// 批量增强
const batchResult = await ontomark.enhanceAll({
  dryRun: false,
  force: false,
});

// 获取状态
const status = await ontomark.getStatus();
```

---

## LLM Provider 接口

**接口定义：**

```typescript
interface LLMProvider {
  recognize(input: RecognizerInput): Promise<RecognizerOutput>;
  inferEntityType?(input: EntityTypeInfoInput): Promise<string>;
}

interface RecognizerInput {
  content: string;
  schema: OntologySchema;
  existingEntities: string[];
}

interface RecognizerOutput {
  entities: Array<{
    text: string;
    entityType?: string;
    confidence: number;
  }>;
}
```

**Claude Code 集成示例：**

```typescript
import { OntoMark, LLMProvider } from 'ontomark';
import Anthropic from '@anthropic-ai/sdk';

const claudeProvider: LLMProvider = {
  async recognize(input: RecognizerInput): Promise<RecognizerOutput> {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `从以下文本中识别实体...`
      }]
    });
    return JSON.parse(response.content[0].text);
  }
};

const ontomark = new OntoMark({
  vaultPath: './notes',
  llmProvider: claudeProvider,
});
```

---

## 设计原则

1. **Markdown First** - Markdown 是唯一事实来源
2. **Non-Intrusive** - 增强过程不改变用户原有知识结构
3. **Obsidian Native** - 输出完全兼容 Obsidian 原生语法
4. **增量处理** - 通过 MD5 hash 机制避免重复处理
5. **AI Agent 友好** - 提供结构化错误输出，支持 Agent 自主处理
