# OntoMark 安装与使用设计文档

> 日期：2026-06-14

## 目标

设计面向 Claude Code 用户的安装方法和使用方法，并撰写项目 README。

## 目标用户

- **主要用户**：Claude Code 用户，通过 `/ontomark` Skill 使用

## 安装方法设计

### 方案：混合安装

用户需要两步操作完成 Skill 安装：

#### Step 1: npm 全局安装

```bash
npm install -g ontomark
```

安装后获得：
- `ontomark` CLI 命令
- Skill 文件（位于 npm 包内的 `.claude/skills/ontomark/`）

#### Step 2: Skill 安装命令

```bash
ontomark skill-install
```

执行内容：
- 复制 Skill 文件到 `~/.claude/skills/ontomark/`
- 显示成功提示
- 提示用户运行 `/reload-plugins`

#### Skill 卸载

```bash
ontomark skill-uninstall
```

### package.json 配置

```json
{
  "name": "ontomark",
  "version": "3.0.0",
  "bin": {
    "ontomark": "dist/v3/cli.js"
  },
  "files": [
    "dist/v3/**/*.js",
    "dist/v3/**/*.d.ts",
    ".claude/skills/**/*"
  ]
}
```

## 使用方法设计

### 流程图

```
创建目录 → 添加文档 → /ontomark ingest → 查看结果
```

### Step 1: 项目初始化

```bash
mkdir -p raw wiki
```

### Step 2: 添加文档

将待处理文档放入 `raw/` 目录。

### Step 3: 运行 Ingest

在 Claude Code 中：
```
/ontomark ingest
```

Skill 自动执行：
1. 扫描 `raw/` 目录内容
2. 分析文档主题，生成推荐的 `ontology.yaml`
3. 用户确认后写入
4. 提取实体，写入 `wiki/`

### Step 4: 查看结果

```bash
ontomark wiki-status .
ontomark lint-all .
```

## README 结构设计

```markdown
# OntoMark

简短描述 + 核心价值

## 特性

- 列出 3-5 个核心特性

## 安装

### 前置要求
- Node.js >= 18
- Claude Code

### 安装步骤
1. npm install -g ontomark
2. ontomark skill-install
3. 重启 Claude Code 或 /reload-plugins

## 快速开始

### 1. 创建项目
mkdir -p raw wiki

### 2. 添加文档
将文档放入 raw/

### 3. 运行 Ingest
/ontomark ingest

### 4. 查看结果
ontomark wiki-status .

## CLI 命令

列出所有 CLI 命令及用途

## 工作原理

简述工作流程

## 许可证

MIT
```

## 待实现

### CLI 新增命令

| 命令 | 用途 |
|------|------|
| `ontomark skill-install` | 安装 Skill 到用户目录 |
| `ontomark skill-uninstall` | 卸载 Skill |
| `ontomark init` | 初始化项目（创建 raw/、wiki/、.ontomark/ 目录）✅ 已实现 |

### package.json 更新

- 确保 `files` 字段包含 Skill 文件
- 确保 `bin` 字段正确指向 CLI 入口
