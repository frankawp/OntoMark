# OntoMark V3 架构设计

## 概述

重构 OntoMark 架构，明确分离 CLI 工具与 Skill 职责：
- **CLI 工具**：原子操作、批量处理、文件管理、格式化
- **Skill**：用户交互、语义理解、工作流编排、LLM 调用

## 核心原则

### 1. 所有实体类型从 ontology.yaml 获取

不硬编码 Entity/Event/Statement 类型。所有类型定义来自 `ontology.yaml`：

```yaml
entity_types:
  Person:
    description: 人物
    template:
      info:
        - key: role
          label: 角色
        - key: organization
          label: 所属组织
  Event:
    description: 事件
    template:
      info:
        - key: date
          label: 发生日期
        - key: location
          label: 地点
```

### 2. 实体即 Wiki 文件

不维护独立的实体存储。实体就是 `wiki/{type}s/{name}.md` 文件。

Claude Code 内置工具直接操作：
- `Read` 读取实体
- `Glob` 查找实体：`wiki/**/*.md`
- `Grep` 搜索内容

### 3. CLI 工具不调用 LLM

所有语义理解由 Skill 中的 LLM Agent 完成。CLI 只提供：
- 文件状态查询
- 格式化写入
- 索引构建
- 规则检查

### 4. 先读后写约束

Skill 在调用 `wiki-write` 前必须先读取或确认文件状态，防止覆盖。

---

## 工具设计

### 工具清单（10 个）

```
文件状态工具:
  raw-status        查询 raw 文件状态
  wiki-status       查询 wiki 文件状态
  ontology-status   查询 ontology 状态
  mark-processed    标记文件已处理

Wiki 工具:
  wiki-write        写入 wiki 页面（强制先读）

索引工具:
  index-build       构建实体索引
  index-query       查询实体索引

Lint 工具:
  lint-orphans      检查孤立页面
  lint-missing      检查缺失链接
  lint-all          综合检查
```

### 工具详细接口

#### raw-status

```typescript
raw-status({
  projectPath: string
})

// 返回
{
  files: {
    path: string,
    lastProcessed?: string,  // 最后处理时间
    modified: boolean,       // 是否被修改过
    hash: string
  }[],
  total: number,
  pending: number  // 未处理/已修改的数量
}
```

#### wiki-status

```typescript
wiki-status({
  projectPath: string
})

// 返回
{
  files: {
    path: string,
    canonical: string,
    type: string,
    lastModified: string,
    humanEdited: boolean  // 是否被人工修改过
  }[],
  total: number
}
```

#### ontology-status

```typescript
ontology-status({
  projectPath: string
})

// 返回
{
  exists: boolean,
  path: string,
  hash: string,
  lastModified: string,
  entityTypes: { [type: string]: EntityTypeDef }
}
```

#### mark-processed

```typescript
mark-processed({
  projectPath: string,
  filePath: string
})

// 更新 .ontomark/processed.json，记录文件处理状态
```

#### wiki-write

```typescript
wiki-write({
  projectPath: string,       // 项目路径
  canonical: string,         // 规范名称
  type: string,              // 实体类型
  aliases?: string[],        // 别名列表
  info?: Record<string, string>,  // 已处理的结构化信息
  content: string,           // 已标注 WikiLinks 的内容（由 Agent 处理）
  sources: { file: string, line: number }[],  // 来源列表
  needsReview?: boolean,     // 是否需审核
  isUpdate: boolean          // true=更新, false=新建
})

// 内部逻辑（仅格式化，不做智能处理）：
// 1. 验证文件存在状态与 isUpdate 匹配
// 2. 加载 ontology template，验证 info 字段是否符合定义
// 3. 生成 frontmatter：
//    - canonical, entity_type, aliases, sources, needs_review, status
// 4. 生成 body：
//    - 新建：标题 + 信息表格（info） + content + 来源表格
//    - 更新：合并 frontmatter（aliases 去重），追加 content/sources
// 5. 写入文件到 wiki/{type}s/{canonical}.md
// 6. 保留人工编辑的非托管内容

// 返回
{
  success: boolean,
  path: string,
  created: boolean
}

// 注意：WikiLinks 标注、别名映射等逻辑由 Agent 在调用前完成
```

**Agent 调用 wiki-write 前需要完成：**

1. 调用 `index-query` 查询 content 中提及的实体
2. 处理实体名称标注：将 "Connor Bedard" 替换为 `[[Connor Bedard]]`
3. 处理别名映射：将 "Bedard" 替换为 `[[Connor Bedard]]`（使用规范名称）
4. 构造 `info` 字段（根据 ontology template）
5. 调用 `wiki-write` 写入

#### index-build

```typescript
index-build({
  projectPath: string
})

// 扫描 wiki 目录，构建 .ontomark/index.json
// 包含：实体名称、别名、类型、wiki路径的映射
```

#### index-query

```typescript
index-query({
  projectPath: string,
  name: string,           // 实体名称或别名
  fuzzy?: boolean         // 是否模糊匹配
})

// 返回
{
  found: boolean,
  canonical?: string,
  type?: string,
  path?: string,
  aliases?: string[]
}
```

#### lint-orphans

```typescript
lint-orphans({
  projectPath: string
})

// 返回
{
  orphans: string[]  // 无入链的实体名称列表
}
```

#### lint-missing

```typescript
lint-missing({
  projectPath: string
})

// 返回
{
  missing: {
    entity: string,
    referencedBy: string[]  // 引用该实体的页面
  }[]
}
```

#### lint-all

```typescript
lint-all({
  projectPath: string
})

// 返回
{
  orphans: string[],
  missing: { entity: string, referencedBy: string[] }[],
  empty: string[],  // 内容过少的页面
  totalIssues: number
}
```

---

## Skill 设计

### Ingest 工作流

```
1. [Tool] ontology-status
   └── 不存在 → 引导用户设计 ontology
       ├── [Tool] raw-status 获取文档列表
       ├── [LLM Agent] 分析文档，推断实体类型
       └── [Write] ontology.yaml

2. [Tool] raw-status 获取待处理文件

3. 对每个 raw 文件:
   ├── [Read] 读取文档内容
   ├── [LLM Agent] 提取实体（name, type, aliases, info, context）
   │
   └── 对每个提取的实体:
       ├── [Tool] index-query 检查是否存在
       │
       ├── 存在:
       │   ├── [Read] 读取现有页面（强制）
       │   ├── [LLM Agent] 判断合并/冲突
       │   ├── [LLM Agent] 处理 content 中的 WikiLinks
       │   │   - 调用 [Tool] index-query 查询相关实体
       │   │   - 标注实体名称 [[canonical]]
       │   │   - 别名映射到规范名称
       │   └── [Tool] wiki-write(isUpdate=true)
       │
       └── 不存在:
           ├── [Tool] index-query 查询相关实体（用于标注）
           ├── [LLM Agent] 处理 content 中的 WikiLinks
           └── [Tool] wiki-write(isUpdate=false)

4. [Tool] mark-processed 标记文件已处理

5. [Tool] index-build 构建索引

6. [Tool] lint-all 检查健康状态

7. [LLM Agent] 展示结果，建议下一步
```

### Query 工作流

```
1. [LLM Agent] 解析用户问题

2. [Tool] index-query 查询涉及的实体

3. [Read] 读取实体页面

4. [LLM Agent] 综合生成回答

5. [LLM Agent] 判断是否建议存回 wiki
   └── 用户同意 → [Tool] wiki-write 创建 Topic 页面
```

### Lint 工作流

```
1. [Tool] lint-all 检查问题

2. [LLM Agent] 分析问题严重程度
   ├── 高优先级 → 展示给用户确认
   └── 中优先级 → 建议自动修复

3. 用户确认自动修复:
   └── 对每个孤立页面:
       ├── [Read] 读取孤立实体页面
       ├── [LLM Agent] 分析与哪些实体相关
       └── [Tool] wiki-write(isUpdate=true) 在相关页面添加引用

4. [Tool] lint-all 验证修复结果
```

---

## 强制规则

### Skill 必须遵守

1. **先读后写**：调用 `wiki-write` 前必须先 `Read` 或 `index-query`
2. **类型来源**：所有实体类型从 `ontology-status` 获取，不硬编码
3. **合并保护**：更新实体时保留人工编辑内容
4. **来源追溯**：每个实体必须记录 sources

### 工具约束

1. `wiki-write` 验证 `isUpdate` 与文件存在状态匹配
2. `index-build` 每次全量重建，保证一致性
3. `lint-*` 只做规则检查，不做修复

---

## 与 V2 对比

| 方面 | V2 | V3 |
|------|----|----|
| 实体存储 | 内存 + Wiki 文件 | 仅 Wiki 文件 |
| 类型定义 | 硬编码 + ontology | 仅 ontology |
| LLM 调用 | CLI 内部 | Skill 控制 |
| 实体操作 | entity-* 工具 | 文件操作 + wiki-write |
| 链接生成 | 自动 | LLM Agent 决定 |
| 用户交互 | 无 | Skill 引导 |

---

## 数据文件结构

```
project/
├── raw/                    # 原始文档（不可变）
├── wiki/                   # 知识库
│   ├── Persons/
│   ├── Events/
│   ├── Statements/
│   └── Topics/
├── ontology.yaml           # 类型定义
└── .ontomark/
    ├── processed.json      # 文件处理状态
    └── index.json          # 实体名称索引
```

### processed.json 格式

```json
{
  "files": {
    "raw/article1.md": {
      "lastProcessed": "2026-06-13T00:00:00Z",
      "hash": "abc123"
    }
  }
}
```

### index.json 格式

```json
{
  "entities": {
    "Connor Bedard": {
      "type": "Person",
      "path": "wiki/Persons/Connor_Bedard.md"
    }
  },
  "aliases": {
    "Bedard": "Connor Bedard"
  }
}
```

---

## 实现优先级

1. **Phase 1**: CLI 工具实现
   - raw-status, wiki-status, ontology-status
   - wiki-write
   - index-build, index-query
   - lint-all

2. **Phase 2**: Skill 工作流
   - 更新 SKILL.md 和 reference/*.md
   - 实现工作流编排

3. **Phase 3**: 迁移与验证
   - 删除 V2 冗余代码
   - 集成测试
