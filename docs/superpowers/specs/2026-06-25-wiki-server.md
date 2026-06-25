# Wiki 预览服务器

**日期：** 2026-06-25
**状态：** 设计已确认

## 概述

为 OntoMark wiki 增加一个本地预览服务器，通过 Web 页面浏览 wiki 内容，支持 WikiLinks 跳转和实体搜索。

## CLI 命令

```bash
ontomark serve <project-path> [--port 8080] [--open]
```

- `<project-path>`：项目根目录
- `--port`：指定端口，默认 8080
- `--open`：自动在默认浏览器打开

## 技术方案

- Node.js 内置 `http` 模块
- `markdown-it` 渲染 Markdown → HTML
- `fs.watch` 监听文件变更
- `index.json` 做 WikiLinks 路由映射

## 依赖

新增 `markdown-it`（Markdown 渲染）和 `@types/markdown-it`（开发类型）。

## 路由表

| URL | 处理方式 |
|-----|---------|
| `GET /` | 读取 wiki/index.md 渲染 |
| `GET /{Type}/{CanonicalName}` | 读取对应 .md 文件渲染 |
| `GET /log` | 读取项目根 log.md 渲染 |
| `GET /ontology` | 读取项目根 ontology.md 渲染 |
| `GET /api/search?q=<query>` | JSON: index-query 模糊匹配结果 |
| `GET /api/index` | JSON: 完整 index.json |
| `GET /static/style.css` | 内联 CSS |
| 其他 | 404 页面 |

## WikiLinks 转换

`[[Sam Altman]]` → `<a href="/Actor/Sam%20Altman" class="wikilink">Sam Altman</a>`

- 从 `index.json` 查找 canonical 名称获取 entity_type
- 找不到 linked entity 时渲染为 `<span class="wikilink-missing">Sam Altman</span>`（灰色虚线）
- 正则匹配：`\[\[([^\]|]+)(?:\|([^\]]+))?\]\]`

## 文件监听

- `fs.watch` 监听 outputDir 整个目录树
- 监听到 `change` 或 `rename` 事件时：
  - 重新加载 `index.json` 到内存
  - 不缓存 HTML 页面，每次请求重新读取 .md 文件
- 页面端通过在 HTML 中加 `<meta http-equiv="refresh">` 或提示用户手动刷新

## 搜索

前端搜索框输入 → 300ms debounce 后调用 `GET /api/search?q=xxx` → 返回结果下拉展示 → 点击跳转。

搜索 API 返回格式：
```json
[
  { "canonical": "Sam Altman", "type": "Actor", "path": "Actor/Sam_Altman" },
  { "canonical": "OpenAI", "type": "Organization", "path": "Organization/OpenAI" }
]
```

搜索为空返回 `[]`。

## 页面渲染

每个页面包含统一的导航栏和内容区：

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{实体名} - OntoMark Wiki</title>
  <link rel="stylesheet" href="/static/style.css">
</head>
<body>
  <nav>
    <a href="/">🏠 Index</a>
    <a href="/log">📋 Log</a>
    <a href="/ontology">📐 Ontology</a>
    <div class="search-box">
      <input type="text" id="search" placeholder="搜索实体..." autocomplete="off">
      <div id="search-results" class="search-dropdown"></div>
    </div>
  </nav>
  <article>{ 渲染后的 HTML 内容 }</article>
  <script src="/static/search.js"></script>
</body>
</html>
```

## 不做的功能

- ❌ 编辑/写入（只读预览）
- ❌ 认证/权限
- ❌ 分页（wiki 规模不大）

## 文件变更

| 操作 | 文件 |
|------|------|
| 🆕 创建 | `src/v3/tools/serve.ts` — HTTP 服务器主逻辑 |
| 🆕 创建 | `src/v3/cli.ts` 中注册 `serve` 命令 |
| ➕ 新增 | `markdown-it` 依赖 |

`serve.ts` 包含：HTTP 服务、路由、Markdown 渲染、WikiLinks 转换、文件监听、搜索 API。单个文件保持内聚。
