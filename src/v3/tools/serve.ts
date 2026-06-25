/**
 * Wiki 预览服务器 - HTTP 服务 + Markdown 渲染 + WikiLinks + 搜索
 */
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import MarkdownIt from 'markdown-it';
import { readConfig } from './read-config';

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

// ============ 状态 ============

let projectPath = '';
let wikiDir = '';
let indexData: { entities: Record<string, { canonical: string; type: string; path: string; aliases: string[] }>; aliases: Record<string, string> } | null = null;

// ============ 工具函数 ============

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============ 索引加载 ============

function loadIndex(): void {
  const indexPath = path.join(projectPath, '.ontomark', 'index.json');
  try {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } catch {
    indexData = null;
  }
}

// ============ WikiLinks 转换 ============

const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function renderWithWikiLinks(content: string): string {
  content = content.replace(WIKI_LINK_RE, (_match, canonical: string, display?: string) => {
    const text = display || canonical;
    const entity = indexData?.entities?.[canonical];
    if (entity) {
      return `<a href="/${encodeURIComponent(entity.type)}/${encodeURIComponent(canonical)}" class="wikilink">${text}</a>`;
    }
    // 别名查找
    if (indexData?.aliases?.[canonical]) {
      const target = indexData.aliases[canonical];
      const targetEntity = indexData?.entities?.[target];
      if (targetEntity) {
        return `<a href="/${encodeURIComponent(targetEntity.type)}/${encodeURIComponent(target)}" class="wikilink">${text}</a>`;
      }
    }
    return `<span class="wikilink-missing">${text}</span>`;
  });
  return md.render(content);
}

// ============ 页面 HTML 模板 ============

function pageHTML(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} - OntoMark Wiki</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif; font-size: 16px; line-height: 1.7; color: #1a1a1a; background: #fff; }
nav { position: sticky; top: 0; z-index: 100; background: #f8f9fa; border-bottom: 1px solid #dee2e6; padding: 8px 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
nav a { color: #1a6fb5; text-decoration: none; font-size: 14px; }
nav a:hover { text-decoration: underline; }
.search-box { position: relative; margin-left: auto; }
.search-box input { padding: 6px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; width: 200px; }
.search-box input:focus { outline: none; border-color: #1a6fb5; }
.search-dropdown { position: absolute; top: 100%; right: 0; width: 300px; background: #fff; border: 1px solid #dee2e6; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: none; max-height: 300px; overflow-y: auto; }
.search-dropdown.active { display: block; }
.search-dropdown a { display: block; padding: 8px 12px; color: #1a1a1a; text-decoration: none; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
.search-dropdown a:last-child { border-bottom: none; }
.search-dropdown a:hover { background: #f0f7ff; }
.search-dropdown .type-badge { display: inline-block; font-size: 11px; padding: 1px 6px; border-radius: 3px; background: #e8f0fe; color: #1a6fb5; margin-left: 8px; }
.search-dropdown .empty { padding: 8px 12px; color: #888; font-size: 13px; }
article { max-width: 860px; margin: 0 auto; padding: 32px 24px; }
article h1 { font-size: 1.8em; border-bottom: 1px solid #dee2e6; padding-bottom: 8px; margin-bottom: 16px; }
article h2 { font-size: 1.4em; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
article h3 { font-size: 1.2em; margin-top: 20px; margin-bottom: 6px; }
article p { margin-bottom: 12px; }
article a { color: #1a6fb5; text-decoration: none; }
article a:hover { text-decoration: underline; }
article a.wikilink { color: #1a6fb5; }
article span.wikilink-missing { color: #999; border-bottom: 1px dashed #ccc; cursor: help; }
article table { border-collapse: collapse; width: 100%; margin: 12px 0; }
article th, article td { border: 1px solid #dee2e6; padding: 8px 12px; text-align: left; }
article th { background: #f8f9fa; font-weight: 600; }
article code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
article pre { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 12px; overflow-x: auto; margin: 12px 0; }
article pre code { background: none; padding: 0; }
article ul, article ol { margin-bottom: 12px; padding-left: 24px; }
article blockquote { border-left: 4px solid #dee2e6; padding-left: 16px; color: #555; margin: 12px 0; }
article hr { border: none; border-top: 1px solid #dee2e6; margin: 24px 0; }
footer { text-align: center; padding: 24px; color: #888; font-size: 13px; }
</style>
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
<article>${bodyHtml}</article>
<footer><a href="/">OntoMark Wiki</a></footer>
<script>
const searchInput = document.getElementById('search');
const searchResults = document.getElementById('search-results');
let debounceTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = searchInput.value.trim();
  if (!q) { searchResults.classList.remove('active'); searchResults.innerHTML = ''; return; }
  debounceTimer = setTimeout(() => {
    fetch('/api/search?q=' + encodeURIComponent(q))
      .then(r => r.json())
      .then(data => {
        if (!data.length) {
          searchResults.innerHTML = '<div class="empty">未找到匹配结果</div>';
        } else {
          searchResults.innerHTML = data.map(e =>
            '<a href="/' + encodeURIComponent(e.type) + '/' + encodeURIComponent(e.canonical) + '">' +
            escapeHtml(e.canonical) + '<span class="type-badge">' + escapeHtml(e.type) + '</span></a>'
          ).join('');
        }
        searchResults.classList.add('active');
      });
  }, 300);
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box')) searchResults.classList.remove('active');
});
function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
</script>
</body>
</html>`;
}

// ============ 读取并渲染文件 ============

function readAndRender(filePath: string): { html: string; title: string } | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // 提取 frontmatter 后的正文
    const body = content.replace(/^---[\s\S]*?---\n?/, '');
    // 提取标题
    const titleMatch = body.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : path.basename(filePath, '.md');
    const html = renderWithWikiLinks(body);
    return { html, title };
  } catch { return null; }
}

// ============ 搜索 API ============

function searchEntities(query: string): Array<{ canonical: string; type: string; path: string }> {
  if (!indexData || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  const results: Array<{ canonical: string; type: string; path: string; score: number }> = [];

  for (const [canonical, entity] of Object.entries(indexData.entities)) {
    const lc = canonical.toLowerCase();
    let score = 0;
    if (lc === q) score = 10;
    else if (lc.startsWith(q)) score = 8;
    else if (lc.includes(q)) score = 5;
    else {
      for (const alias of entity.aliases) {
        const la = alias.toLowerCase();
        if (la === q) score = 7;
        else if (la.includes(q)) score = 4;
      }
    }
    if (score > 0) results.push({ canonical, type: entity.type, path: entity.path, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 10).map(({ score, ...rest }) => rest);
}

// ============ 文件监听 ============

let watchTimer: ReturnType<typeof setTimeout> | null = null;

function setupWatcher(dir: string): void {
  if (!fs.existsSync(dir)) return;
  fs.watch(dir, { recursive: true }, (_event, filename) => {
    if (!filename || !filename.endsWith('.md')) return;
    // 防抖：100ms 内多次变更合并一次
    if (watchTimer) clearTimeout(watchTimer);
    watchTimer = setTimeout(() => {
      loadIndex();
    }, 100);
  });
}

// ============ HTTP 服务 ============

export async function startServer(project: string, port: number, openBrowser: boolean): Promise<void> {
  projectPath = project;
  const config = await readConfig(projectPath);
  wikiDir = path.join(projectPath, config.outputDir);
  loadIndex();
  setupWatcher(wikiDir);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // API: 搜索
    if (pathname === '/api/search') {
      const q = url.searchParams.get('q') || '';
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(searchEntities(q)));
      return;
    }

    // API: 完整索引
    if (pathname === '/api/index') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(indexData || { entities: {}, aliases: {} }));
      return;
    }

    // 静态文件: CSS 直接内联在 HTML 中，不需要额外请求

    // 路由
    let filePath = '';
    let pageTitle = '';

    if (pathname === '/') {
      filePath = path.join(wikiDir, 'index.md');
      pageTitle = 'Wiki Index';
    } else if (pathname === '/log') {
      filePath = path.join(projectPath, 'log.md');
      pageTitle = '操作日志';
    } else if (pathname === '/ontology') {
      filePath = path.join(projectPath, 'ontology.md');
      pageTitle = '本体定义';
    } else if (pathname.startsWith('/static/')) {
      // 内联资源，不处理
      res.writeHead(404); res.end('Not Found');
      return;
    } else {
      // /{Type}/{Canonical}
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length === 2) {
        const entityType = decodeURIComponent(parts[0]);
        const canonical = decodeURIComponent(parts[1]);
        filePath = path.join(wikiDir, entityType, `${canonical}.md`);
        pageTitle = canonical;
      }
    }

    if (filePath && fs.existsSync(filePath)) {
      const result = readAndRender(filePath);
      if (result) {
        const html = pageHTML(result.title || pageTitle, result.html);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
    }

    // 404
    const notFoundHtml = pageHTML('Not Found', '<h1>404</h1><p>页面不存在。</p><a href="/">返回首页</a>');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(notFoundHtml);
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`🌐 OntoMark Wiki 服务已启动: ${url}`);
    if (openBrowser) {
      try {
        execSync(`open ${url}`);
      } catch { /* ignore */ }
    }
  });
}
