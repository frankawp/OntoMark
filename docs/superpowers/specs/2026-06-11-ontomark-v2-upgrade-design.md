# OntoMark V2 升级设计文档

**日期**: 2026-06-11
**版本**: 1.0
**范围**: 第一阶段核心功能

---

## 1. 概述

### 1.1 目标

将 OntoMark 从 V1 的单一 Vault 模式升级为 V2 的 LLM Wiki 架构，实现：

- **Compile Once, Query Many**: 知识编译一次，持续复用
- **Raw/Wiki 分层**: 原始资料不可变，Wiki 可编辑
- **Canonical Object**: 每个知识对象有唯一标准页面
- **Evidence Collection**: 所有知识可追溯来源

### 1.2 设计参考

- [V2 设计文档](../design/V2.md)
- [LLM Wiki 模式](../llm-wiki.md)

### 1.3 升级策略

采用**渐进式重构**策略：

- 在现有代码基础上重构
- 保留可复用逻辑（EntityExtractor、EntityMerger 等）
- 逐步完善，风险可控
- 保持 V1 API 向后兼容过渡期

---

## 2. 架构设计

### 2.1 核心理念

```
Raw Sources (不可变)
     ↓ Ontology Discovery
     ↓ Knowledge Object Discovery
     ↓ Entity Resolution
     ↓ Evidence Collection
Wiki (可变，知识编译结果)
     ↓ Link Builder
     ↓ Backlink Builder (第二阶段)
Knowledge Network
```

### 2.2 目录结构

```
project/
├── raw/                    # 原始文档（不可修改）
│   ├── design/
│   ├── adr/
│   └── meeting/
├── wiki/                   # Wiki 页面（可修改）
│   ├── Concepts/           # 按实体类型组织
│   ├── Systems/
│   ├── ADRs/
│   ├── Topics/             # 主题页（第二阶段）
│   └── index.md            # 自动生成的索引
├── ontology.yaml           # 实体类型定义
├── CLAUDE.md               # Claude Code 指令
├── AGENTS.md               # 通用 Agent 指令
└── .ontomark/
    ├── config.yaml         # 配置文件
    └── cache/
        ├── entities.json   # 实体缓存
        ├── aliases.json    # 别名索引
        └── build.json      # 构建状态缓存
```

### 2.3 模块划分

```
src/
├── discovery/              # 知识对象发现
│   ├── extractor.ts        # 实体提取
│   ├── resolver.ts         # 实体消歧
│   └── types.ts
├── builder/                 # Wiki 构建
│   ├── page-builder.ts     # 页面生成
│   ├── link-builder.ts     # 链接生成
│   ├── index-builder.ts    # 索引生成
│   └── types.ts
├── storage/                 # 存储层
│   ├── cache.ts            # JSON 缓存管理
│   └── fs.ts               # 文件系统操作
├── parser/                  # Markdown 解析（基于 remark）
│   ├── ast.ts              # AST 工具
│   ├── frontmatter.ts      # Frontmatter 处理
│   └── links.ts            # 链接解析
├── llm/                     # LLM 抽象层
│   ├── types.ts            # AIProvider 接口
│   ├── deepseek.ts         # DeepSeek 实现
│   └── openai.ts           # OpenAI 实现
├── schema/                  # 本体定义（保留）
├── cli.ts                   # CLI 入口
└── index.ts                 # SDK 入口
```

---

## 3. 核心模块设计

### 3.1 Knowledge Object Discovery

**EntityExtractor（增强版）**

```typescript
interface ExtractionResult {
  entities: EntityMention[];
  metadata: {
    sourceFile: string;
    timestamp: string;
    hash: string;
  };
}

interface EntityMention {
  name: string;              // 原始名称
  entityType: string;        // 推断的类型（Concept, System, ADR...）
  aliases: string[];         // 发现的别名
  context: string;           // 上下文片段（用于消歧）
  confidence: number;        // 置信度 0-1
  location: {
    file: string;
    line: number;
    text: string;
  };
}
```

工作流程：

1. 读取 `raw/` 下的所有 Markdown 文件
2. 使用 remark 解析为 AST
3. 提取文本内容，调用 LLM 识别实体提及
4. 根据 ontology.yaml 定义推断实体类型
5. 记录上下文和位置信息
6. 输出到缓存 `entities.json`

### 3.2 Entity Resolution

**EntityResolver（新模块）**

```typescript
interface ResolvedEntity {
  canonicalName: string;     // 标准名称
  aliases: string[];         // 别名列表
  entityType: string;        // 确定的类型
  sources: Evidence[];       // 来源证据
  confidence: number;        // 最终置信度
  needsReview: boolean;      // 是否需要人工审核
}

interface Evidence {
  file: string;
  line: number;
  context: string;           // 引用片段
  timestamp: string;
}
```

消歧策略：

| 场景 | 策略 |
|------|------|
| 同名不同类型 | 标记 `needsReview=true`，禁止自动合并 |
| 别名匹配 | 自动合并，如 "JWT" = "JSON Web Token" |
| 低置信度 (< 0.6) | 标记 `needsReview=true` |
| 高置信度且无冲突 | 自动合并，生成 Canonical Object |

### 3.3 Evidence Collection

每个 wiki 页面必须包含来源追踪。

**Frontmatter 格式：**

```yaml
---
canonical: JWT
entity_type: Concept
aliases:
  - JSON Web Token
  - JsonWebToken
sources:
  - file: raw/design/auth.md
    lines: [12, 45]
  - file: raw/adr/ADR-001.md
    lines: [3, 8]
status: canonical
needs_review: false
last_updated: 2026-06-11
---
```

### 3.4 Canonical Page Generation

根据 ontology.yaml 中的模板生成页面：

```yaml
# ontology.yaml 示例
entity_types:
  Concept:
    template:
      summary: "定义和核心概念"
      info:
        - key: "定义"
        - key: "用途"
        - key: "相关技术"
      sources: "来源文档"
      related: "相关概念"
      updated: "最后更新时间"
```

生成的页面结构：

```markdown
# JWT

## 定义和核心概念
[从多个来源提取的聚合内容]

## 相关概念
- [[Authentication]]
- [[Security]]
- [[OAuth]]

## 来源文档
- raw/design/auth.md (lines 12, 45)
- raw/adr/ADR-001.md (lines 3, 8)

---
*最后更新: 2026-06-11*
```

---

## 4. 基础设施设计

### 4.1 Markdown 解析层

基于 remark/unified 生态。

**AST 工具模块：**

```typescript
// parser/ast.ts
interface MarkdownAST {
  root: Root;
  frontmatter: Record<string, any> | null;
  content: Content[];
  links: WikiLink[];
}

interface WikiLink {
  target: string;
  text: string;
  position: { start: number; end: number };
}

// 核心功能
function parseMarkdown(content: string): MarkdownAST;
function extractWikiLinks(ast: Root): WikiLink[];
function insertWikiLink(ast: Root, position: number, target: string): Root;
function updateFrontmatter(ast: Root, data: Record<string, any>): Root;
function stringifyMarkdown(ast: Root): string;
```

**依赖包：**
- `unified` - 统一接口
- `remark-parse` - Markdown 解析
- `remark-stringify` - Markdown 序列化
- `remark-frontmatter` - Frontmatter 处理
- `unist-util-visit` - AST 遍历

### 4.2 LLM Provider 抽象层

**统一接口定义：**

```typescript
// llm/types.ts
interface AIProvider {
  // 实体提取（核心功能）
  extract(text: string, schema: OntologySchema): Promise<ExtractionResult>;

  // 文本分类（实体类型推断）
  classify(text: string, types: string[]): Promise<{ type: string; confidence: number }>;

  // 内容生成（页面内容合成）
  generate(prompt: string, context: string): Promise<string>;

  // 健康检查
  isAvailable(): Promise<boolean>;
}

interface AIProviderConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}
```

**Provider 工厂：**

```typescript
// llm/factory.ts
function createProvider(type: 'deepseek' | 'openai', config: AIProviderConfig): AIProvider;

function createProviderFromEnv(): AIProvider {
  // 优先级：OPENAI_API_KEY > DEEPSEEK_API_KEY
  // 自动检测环境变量，选择可用 provider
}
```

### 4.3 缓存管理层

**CacheManager：**

```typescript
// storage/cache.ts
interface EntityCache {
  entities: Map<string, CachedEntity>;
  aliases: Map<string, string>;  // alias -> canonicalName
  lastScan: string;
  schemaHash: string;
}

interface CachedEntity {
  name: string;
  entityType: string;
  sources: Evidence[];
  wikiPagePath: string;
  hash: string;
}

class CacheManager {
  constructor(cacheDir: string);

  async load(): Promise<EntityCache>;
  async save(cache: EntityCache): Promise<void>;
  async invalidate(entityName?: string): Promise<void>;
  async needsRebuild(rawFile: string): Promise<boolean>;
}
```

---

## 5. CLI 设计

### 5.1 命令结构

```bash
# 初始化项目结构
ontomark init [path]

# 完整构建（extract + link）
ontomark build

# 分步执行
ontomark extract      # 从 raw 提取实体
ontomark link         # 在 wiki 生成链接

# 查看状态
ontomark status

# 审核（待处理项）
ontomark review

# Lint 检查（第三阶段）
ontomark lint
```

### 5.2 命令详情

```typescript
// cli.ts
program
  .command('init [path]')
  .description('初始化 OntoMark 项目结构')
  .option('--force', '强制覆盖现有文件')
  .action(async (path?: string, options) => {
    // 创建目录结构
    // 生成默认 ontology.yaml
    // 创建 CLAUDE.md 和 AGENTS.md 模板
  });

program
  .command('build')
  .description('完整构建：extract → link')
  .option('--raw-path <path>', '指定 raw 目录')
  .option('--wiki-path <path>', '指定 wiki 目录')
  .option('--force', '强制重建，忽略缓存')
  .option('--provider <name>', 'LLM provider: deepseek | openai')
  .action(async (options) => {
    // 执行完整流程
  });
```

### 5.3 构建流程

**extract 流程：**

```
扫描 raw/*.md
     ↓
解析每个文件（remark AST）
     ↓
LLM 提取实体提及
     ↓
合并到缓存（EntityResolver）
     ↓
消歧处理（自动/标记待审核）
     ↓
生成 wiki 页面（WikiPageBuilder）
     ↓
写入 wiki/Concepts/*.md 等
     ↓
生成 index.md
```

**link 流程：**

```
扫描 wiki/**/*.md
     ↓
构建实体索引（从缓存 + 文件名）
     ↓
解析每个 wiki 文件内容
     ↓
识别可链接的文本
     ↓
生成 [[WikiLink]]
     ↓
更新 frontmatter（tags, last_updated）
     ↓
写入文件
```

---

## 6. 错误处理

### 6.1 错误类型

```typescript
// utils/errors.ts
class OntoMarkError extends Error {
  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'OntoMarkError';
  }
}

class ValidationError extends OntoMarkError {
  // 目录结构、schema 格式验证失败
}

class ExtractionError extends OntoMarkError {
  // LLM 提取失败
}

class ResolutionConflictError extends OntoMarkError {
  // 实体消歧冲突
  entities: string[];
  candidates: ResolvedEntity[];
}

class LLMProviderError extends OntoMarkError {
  // LLM API 错误
  provider: string;
}
```

### 6.2 处理策略

| 错误类型 | 处理方式 |
|---------|---------|
| ValidationError | 停止构建，提示用户修复 |
| ExtractionError | 记录失败文件，继续处理其他文件 |
| ResolutionConflictError | 标记 `needsReview=true`，不阻止构建 |
| LLMProviderError | 停止构建，提示检查 API Key |

---

## 7. 测试策略

### 7.1 测试结构

```
tests/
├── parser/                 # remark AST 测试
│   ├── ast.test.ts
│   ├── frontmatter.test.ts
│   └── links.test.ts
├── discovery/              # 实体发现测试
│   ├── extractor.test.ts
│   └── resolver.test.ts
├── builder/                 # 构建器测试
│   ├── page-builder.test.ts
│   ├── link-builder.test.ts
│   └── index-builder.test.ts
├── storage/                 # 缓存测试
│   └── cache.test.ts
├── llm/                     # LLM provider 测试
│   ├── deepseek.test.ts
│   └── openai.test.ts
├── integration/             # 集成测试
│   ├── build-flow.test.ts   # 完整构建流程
│   └── cli.test.ts          # CLI 命令测试
└── fixtures/                # 测试数据
    ├── raw/                 # 模拟 raw 文档
    ├── wiki/                # 预期 wiki 输出
    └── ontology.yaml        # 测试用 schema
```

### 7.2 覆盖率目标

| 模块 | 目标 | 重点 |
|------|------|------|
| parser | 90% | AST 解析、frontmatter、链接提取 |
| discovery | 85% | 实体提取、消歧逻辑 |
| builder | 85% | 页面生成、链接插入 |
| storage | 80% | 缓存读写、增量更新 |
| llm | 70% | Mock API 调用 |
| integration | 关键路径 | 完整流程、CLI |

---

## 8. 迁移计划

### 8.1 实施顺序

```
1. 基础设施（Week 1-2）
   ├── 添加 remark 依赖
   ├── 实现 parser/ast.ts
   ├── 实现 parser/frontmatter.ts
   ├── 实现 parser/links.ts
   └── 重构 llm/types.ts（统一接口）

2. 核心模块（Week 3-4）
   ├── 实现 discovery/extractor.ts（增强版）
   ├── 实现 discovery/resolver.ts（新模块）
   ├── 实现 builder/page-builder.ts（增强版）
   └── 实现 builder/link-builder.ts（重构）

3. 存储与缓存（Week 5）
   ├── 实现 storage/cache.ts
   └── 迁移现有缓存逻辑

4. CLI 重构（Week 6）
   ├── 重构 cli.ts（新命令结构）
   ├── 实现 init 命令
   └── 重构 build/extract/link 命令

5. 测试与文档（Week 7）
   ├── 编写单元测试
   ├── 编写集成测试
   └── 更新 README

6. 清理旧代码（Week 8）
   ├── 移除 V1 API（标记 deprecated）
   ├── 移除 marked 依赖
   └── 重构目录结构
```

### 8.2 向后兼容

```typescript
// index.ts
export class OntoMark {
  // V2 API（推荐）
  constructor(options: { rawPath, wikiPath, llmProvider });

  // V1 API（deprecated，保留 6 个月过渡期）
  /** @deprecated 使用 { rawPath, wikiPath } 替代 */
  constructor(options: { vaultPath, llmProvider });
}
```

### 8.3 用户迁移指南

```markdown
## 迁移指南

1. 调整目录结构：
   - 创建 `raw/` 目录，移动原始文档
   - 创建 `wiki/` 目录
   - 移动 `ontology.yaml` 到根目录

2. 更新 CLAUDE.md：
   - 使用新的 CLI 命令
   - `ontomark build` 替代 `ontomark enhance-all`

3. 清理旧文件：
   - 删除 `.ontomark/cache.json`（会自动重建）
   - 删除旧的实体索引文件
```

---

## 9. 第一阶段范围确认

### 9.1 包含功能

- ✅ Knowledge Object Discovery
- ✅ Entity Resolution（别名合并、消歧）
- ✅ Evidence Collection
- ✅ Canonical Page Generation
- ✅ Link Builder
- ✅ Index Builder
- ✅ CLI 命令
- ✅ remark/unified AST 解析
- ✅ AIProvider 统一接口
- ✅ OpenAI + DeepSeek 支持
- ✅ JSON 缓存管理

### 9.2 暂缓功能（后续阶段）

- ⏸ Backlink Builder（第二阶段）
- ⏸ Topic Builder（第二阶段）
- ⏸ Context Builder（第三阶段）
- ⏸ Lint System（第三阶段）
- ⏸ Agent Integration（第四阶段）
- ⏸ SQLite 缓存（按需）

---

## 10. 成功标准

第一阶段完成后，应能够：

1. 给定 `raw/` 目录的 Markdown 文档，自动提取实体
2. 自动合并别名，标记需要人工审核的冲突
3. 为每个 Canonical Object 生成 wiki 页面
4. 自动在 wiki 页面间生成 `[[WikiLink]]`
5. 生成 `index.md` 索引
6. 支持 DeepSeek 和 OpenAI 两种 LLM provider
7. 通过完整的测试覆盖
