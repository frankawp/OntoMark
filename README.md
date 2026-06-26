# OntoMark

> 将文档转化为持久化知识库，让 AI Agent 理解你的知识领域。

OntoMark 是一个本体驱动的知识库构建工具。它从文档中提取实体，构建结构化的 wiki 知识库，让 Claude Code Agent 能够理解和查询你的知识领域。

## 核心理念

传统的 RAG 系统每次查询都从原始文档重新检索，知识无法累积。OntoMark 采用不同的方式：LLM **增量构建并维护一个持久的 wiki**——结构化的、相互链接的 Markdown 文件集合，位于你和原始来源之间。

核心差异：**wiki 是持久的、可复利的知识产物。** 交叉引用已经建立，矛盾已被标记，综合分析已反映所有已读内容。每添加一个来源、每问一个问题，wiki 都在变得更丰富。

## 特性

- **🤖 AI Agent 集成** — 通过 `/ontomark` Skill 在 Claude Code 中直接使用
- **📊 本体驱动** — 通过 `ontology.md` 定义知识维度，AI 自动推荐结构
- **🔄 增量处理** — 基于 git commit hash 检测文件变更，只处理需要更新的内容
- **🔗 WikiLinks 原生支持** — 生成 Obsidian 兼容的双向链接
- **🔍 多工作流** — Init（初始化）、Ingest（导入）、Query（查询）、Lint（检查）、Explore（探索）
- **🌐 Wiki 预览服务器** — 内置 HTTP 服务器，实时预览知识库

## 安装

### 前置要求

- Node.js >= 18
- Claude Code
- Git（用于增量检测）

### 安装步骤

```bash
# 1. 全局安装 CLI
npm install -g ontomark

# 2. 安装 Skill 到 Claude Code
ontomark skill-install

# 3. 重启 Claude Code 或运行命令
/reload-plugins
```

### 验证安装

在 Claude Code 中运行：
```
/ontomark
```

看到 Skill 帮助信息即表示安装成功。

## 快速开始

### 1. 初始化项目

```bash
ontomark init my-knowledge
cd my-knowledge
```

这会自动创建以下结构：
- `raw/` — 源文档目录（不可变）
- `wiki/` — 知识库输出目录
- `.ontomark/` — 内部状态目录
- `ontology.md` — 知识维度定义

### 2. 添加文档

将待处理的 Markdown 文档放入 `raw/` 目录。

### 3. 运行 Ingest

在 Claude Code 中：
```
/ontomark ingest
```

Skill 会自动：
1. 扫描 `raw/` 目录内容
2. 分析文档主题，推荐知识维度
3. 提取实体，写入 `wiki/`
4. 构建 WikiLinks 网络关系

### 4. 查看结果

```bash
# 查看 wiki 状态
ontomark wiki-status .

# 检查健康状态
ontomark lint-all .

# 启动预览服务器
ontomark serve . --port 8080 --open
```

## CLI 命令

| 命令 | 用途 |
|------|------|
| `ontomark init [path]` | 初始化项目结构 |
| `ontomark skill-install` | 安装 Skill 到 Claude Code |
| `ontomark skill-uninstall` | 卸载 Skill |
| `ontomark pending-files <path>` | 检测待处理的 raw 文件 |
| `ontomark wiki-status <path>` | 查看 wiki 状态 |
| `ontomark index-build <path>` | 构建实体索引 |
| `ontomark index-query <path> <name>` | 查询实体索引 |
| `ontomark mark-processed <path>` | 标记当前 HEAD 为已处理 |
| `ontomark lint-all <path>` | 检查 wiki 健康状态 |
| `ontomark serve <path>` | 启动 Wiki 预览服务器 |
| `ontomark serve-status <path>` | 查看服务器状态 |
| `ontomark serve-stop <path>` | 停止服务器 |

### pending-files 参数

```bash
# 只看待处理文件（默认）
ontomark pending-files ./ --modified true --limit 10

# 只看已处理文件
ontomark pending-files ./ --modified false

# 查看全部文件
ontomark pending-files ./ --modified all --limit 0
```

### serve 参数

```bash
# 默认端口 8080
ontomark serve .

# 自定义端口
ontomark serve . --port 3000

# 自动打开浏览器
ontomark serve . --open
```

## Skill 工作流

OntoMark 提供五个核心工作流，通过 `/ontomark` 入口自动路由：

| 工作流 | 触发关键词 | 功能 |
|--------|-----------|------|
| `/ontomark-init` | 初始化/init/创建项目 | 初始化知识库结构，配置输入输出目录 |
| `/ontomark-ingest` | 处理/添加/导入/ingest | 从文档提取实体，写入 wiki |
| `/ontomark-query` | 谁/什么/查询/query | 查询知识库，生成回答 |
| `/ontomark-lint` | 检查/lint/健康/孤立 | 检查 wiki 健康状态 |
| `/ontomark-explore` | explore/探索/知识点 | 从知识点出发，探索 raw 内容 |

### Ingest 工作流

```
raw/  →  提取实体  →  WikiLinks 标注  →  冲突检查  →  wiki/
              ↓
        ontology.md（知识维度定义）
```

支持两种处理模式：
- **逐一深入** — 每个文件单独讨论和确认，适合重要或复杂的新源
- **批量快速** — 合并提取后一次确认，适合例行更新

### Explore 工作流

从用户提出的知识点出发，在 `raw/` 中搜索相关内容，理解后确认写入 `wiki/`。适合：
- 主动挖掘某个感兴趣的话题
- 验证某个知识点的来源
- 发现新的知识关联

## 工作原理

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    raw/     │ ──► │   Ingest    │ ──► │    wiki/    │
│   文档目录   │     │   提取实体   │     │   知识库    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ontology.md  │
                    │  知识维度    │
                    └─────────────┘
```

### 增量处理机制

- 文件内容变化（MD5 hash）→ 重新处理
- `ontology.md` 变化 → 所有文件重新处理
- 已处理文件跳过，节省时间
- 基于 git commit hash 追踪已处理状态

### 本体驱动提取

`ontology.md` 定义知识维度（如 Actor、Event、Thing），Ingest 时：
1. 读取维度定义
2. 注入提取提示词
3. 按维度分类提取实体
4. 写入对应目录结构

## 目录结构

```
my-knowledge/
├── raw/                    # 源文档目录（不可变）
│   ├── article1.md
│   └── article2.md
│
├── wiki/                   # 知识库目录（由 AI 生成）
│   ├── index.md            # 索引页面
│   ├── Actors/             # 按知识维度分目录
│   ├── Events/
│   ├── Things/
│   └── ...
│
├── ontology.md             # 知识维度定义
├── log.md                  # 操作日志
└── .ontomark/              # 内部数据
    ├── config.json         # 配置文件
    ├── index.json          # 实体索引
    └── processed.json      # 处理状态
```

## 实体页面格式

```markdown
---
canonical: Sam Altman
type: Actor
aliases: [Altman, Sam, 山姆·奥特曼]
status: active
tags: [科技领袖]
provenance:
  - source: raw/article.md
    cite: 第三段
    retrieved: 2026-06-25
relations:
  - type: employs
    target: OpenAI
    label: CEO
updated: 2026-06-25
---

# Sam Altman

OpenAI 的 CEO，在 AI 领域有重要影响。

## 履历

- 2015 — 联合创立 [[OpenAI]]
- 2022-11 — 发布 [[ChatGPT]]
```

## 开发

```bash
# 克隆项目
git clone https://github.com/frankawp/ontomark.git
cd ontomark

# 安装依赖
npm install

# 编译
npm run build

# 本地测试
./ontomark --help

# 运行测试
npm test
```

## 适用场景

- **个人知识管理** — 追踪目标、健康、心理学、自我提升
- **研究笔记** — 深度追踪某个课题，阅读论文、文章、报告
- **读书笔记** — 逐章整理，构建人物、主题、情节网络
- **团队知识库** — 从 Slack、会议纪要、项目文档中自动维护内部 wiki
- **竞品分析** — 收集信息，持续追踪竞争对手动态

## 灵感来源

本项目受到 [LLM Wiki](./docs/idea/LLM_Wiki.md) 理念的启发：LLM 承担繁琐的知识库维护工作（更新交叉引用、保持摘要最新、标记矛盾），人类专注于策展来源、提出好问题、思考意义。

## 许可证

MIT
