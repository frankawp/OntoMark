# OntoMark

> 将文档转化为持久化知识库，让 AI Agent 理解你的知识领域。

OntoMark 是一个本体驱动的知识库构建工具。它从文档中提取实体，构建结构化的 wiki 知识库，让 Claude Code Agent 能够理解和查询你的知识领域。

## 特性

- **🤖 AI Agent 集成** — 通过 `/ontomark` Skill 在 Claude Code 中直接使用
- **📊 本体驱动** — 自动推荐本体结构，无需手动配置
- **🔄 增量处理** — 智能检测文件和本体变化，只处理需要更新的内容
- **🔗 WikiLinks 原生支持** — 生成 Obsidian 兼容的双向链接
- **⚡ 批量高效** — 支持批量写入实体，高效处理大量文档

## 安装

### 前置要求

- Node.js >= 18
- Claude Code

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

### 1. 创建项目结构

```bash
mkdir -p my-knowledge/raw my-knowledge/wiki
cd my-knowledge
```

### 2. 添加文档

将待处理的 Markdown 文档放入 `raw/` 目录。

### 3. 运行 Ingest

在 Claude Code 中：
```
/ontomark ingest
```

Skill 会自动：
1. 扫描 `raw/` 目录内容
2. 分析文档主题，推荐 `ontology.yaml`
3. 你确认后，提取实体写入 `wiki/`

### 4. 查看结果

```bash
# 查看 wiki 状态
ontomark wiki-status .

# 检查健康状态
ontomark lint-all .
```

## CLI 命令

| 命令 | 用途 |
|------|------|
| `ontomark skill-install` | 安装 Skill 到 Claude Code |
| `ontomark skill-uninstall` | 卸载 Skill |
| `ontomark ontology-status <path>` | 查看本体状态 |
| `ontomark raw-status <path>` | 查看待处理文件 |
| `ontomark wiki-status <path>` | 查看 wiki 状态 |
| `ontomark index-build <path>` | 构建实体索引 |
| `ontomark lint-all <path>` | 检查 wiki 健康状态 |

### raw-status 参数

```bash
# 只看待处理文件（默认）
ontomark raw-status ./ --modified true --limit 10

# 只看已处理文件
ontomark raw-status ./ --modified false

# 查看全部文件
ontomark raw-status ./ --modified all --limit 0
```

## 工作原理

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    raw/     │ ──► │   Ingest    │ ──► │    wiki/    │
│   文档目录   │     │   提取实体   │     │   知识库    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ontology.yaml│
                    │   本体定义   │
                    └─────────────┘
```

### Ingest 流程

1. **扫描文档** — 检测 `raw/` 中的新文件或变更文件
2. **本体推荐** — 分析文档主题，生成推荐的 `ontology.yaml`
3. **实体提取** — 多层提取：直接识别、上下文推断、全局总结
4. **写入 wiki** — 为每个实体创建页面，标注 WikiLinks

### 增量处理

- 文件内容变化（MD5 hash）→ 重新处理
- `ontology.yaml` 变化 → 所有文件重新处理
- 已处理文件跳过，节省时间

## 目录结构

```
my-knowledge/
├── raw/                    # 源文档目录（不可变）
│   ├── article1.md
│   └── article2.md
│
├── wiki/                   # 知识库目录（由 CLI 生成）
│   ├── Person/
│   ├── Organization/
│   ├── Product/
│   └── ...
│
├── ontology.yaml           # 本体定义
└── .ontomark/              # 内部数据
    └── processed.json      # 处理状态记录
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
```

## 许可证

MIT
