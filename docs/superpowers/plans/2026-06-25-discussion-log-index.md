# 讨论门、log.md 与 index.md 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 ingest 中增加讨论门、在所有技能中追加 log.md、让 index-build 生成 index.md

**Architecture:** 一个 CLI 工具变更（index-build 增加 index.md 输出）+ 四个技能文件的修改（ingest/explore/query/lint 增加 log.md 追加和环境步骤）

**Tech Stack:** TypeScript (CLI), Markdown (skills)

## Global Constraints

- log.md 放在项目根目录（`{projectRoot}/log.md`）
- index.md 放在 outputDir 根目录（`{outputDir}/index.md`）
- log.md 格式：`## [YYYY-MM-DD] ...` 标题 + 结构化键值对 + `---` 分隔
- index.md 按 type 分组，每个实体一行 `- [[canonical]] — 摘要 _(updated)_`
- index.md 提取摘要时，优先取 frontmatter 的 description，其次取正文第一段前 100 字

---

### Task 1: index-build 生成 index.md

**Files:**
- Modify: `src/v3/tools/index-build.ts`
- Test: `tests/v3/tools/index-build.test.ts`

**Interfaces:**
- Consumes: `indexBuild(projectPath)` — existing function
- Produces: `indexBuild()` now also writes `{outputDir}/index.md`
- CLI: `ontomark index-build <path>` — interface unchanged

- [ ] **Step 1: 在 index-build.ts 中增加 index.md 生成逻辑**

在 `src/v3/tools/index-build.ts` 的 `scanDir` 函数中，除了构建 index.json 外，同时收集每个实体的一行摘要。然后在文件末尾、写入 index.json 之后，增加写入 index.md 的代码。

```typescript
// 在 index-build.ts 的 scanDir 中增加摘要收集
interface IndexEntry {
  canonical: string;
  type: string;
  summary: string;
  updated: string;
}

async function extractSummary(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(content);
    // 1. 优先取 frontmatter description
    if (parsed.data.description && typeof parsed.data.description === 'string') {
      return parsed.data.description.trim();
    }
    // 2. 取正文第一段（# 标题后的第一个非空段落）
    const body = parsed.content.trim();
    const lines = body.split('\n');
    let inSummary = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        inSummary = true;
        continue;
      }
      if (inSummary && trimmed.length > 0 && !trimmed.startsWith('#')) {
        // 截取前 100 字符
        return trimmed.length > 100 ? trimmed.substring(0, 100) + '…' : trimmed;
      }
    }
    // 3. 回退：使用 canonical
    return parsed.data.canonical || '';
  } catch {
    return '';
  }
}
```

在 `indexBuild` 函数末尾、写入 index.json 之后增加：

```typescript
// 按 type 分组生成 index.md
const entries: IndexEntry[] = [];
for (const [canonical, entity] of Object.entries(entities)) {
  const fullPath = path.join(wikiDir, entity.path);
  const summary = await extractSummary(fullPath);
  entries.push({
    canonical,
    type: entity.type,
    summary,
    updated: '', // 可从文件 mtime 获取
  });
}

// 按 type 分组
const grouped: Record<string, IndexEntry[]> = {};
for (const entry of entries) {
  if (!grouped[entry.type]) grouped[entry.type] = [];
  grouped[entry.type].push(entry);
}

// 生成 index.md 内容
const now = new Date().toISOString().split('T')[0];
let indexContent = `# Wiki Index\n\n_最后更新：${now} | 共 ${entries.length} 个实体_\n\n`;

for (const [type, typeEntries] of Object.entries(grouped)) {
  indexContent += `## ${type}\n\n`;
  for (const entry of typeEntries) {
    indexContent += `- [[${entry.canonical}]] — ${entry.summary}\n`;
  }
  indexContent += '\n';
}

const indexPath = path.join(wikiDir, 'index.md');
await fs.writeFile(indexPath, indexContent, 'utf-8');
```

- [ ] **Step 2: 运行测试验证**

```bash
cd /path/to/OntoMark
npm test
# 预期：所有已有测试依然通过
```

- [ ] **Step 3: 验证 index.md 生成**

```bash
# 用已有 wiki 数据验证
ontomark index-build /path/to/OntoMark
cat /path/to/OntoMark/wiki/index.md
# 预期：包含按 type 分组的实体列表
```

- [ ] **Step 4: Commit**

```bash
git add src/v3/tools/index-build.ts tests/v3/tools/index-build.test.ts
git commit -m "feat: index-build generates index.md with entity summary"
```

---

### Task 2: ingest 增加讨论门

**Files:**
- Modify: `skills/ontomark-ingest/SKILL.md`

**Interfaces:**
- Consumes: 现有的 ingest 工作流（提取 → WikiLinks → 冲突 → 写入）
- Produces: 在提取和 WikiLinks 之间增加讨论门步骤

- [ ] **Step 1: 更新流程图**

在 `skills/ontomark-ingest/SKILL.md` 的 flowchart 中，在"实体提取"和"WikiLinks 标注"之间增加"讨论门"菱形节点：

```diff
     "实体提取\n[entity-extraction.md]" -> "WikiLinks 标注\n[wikilinks-annotation.md]" [shape=box];
+    "实体提取\n[entity-extraction.md]" -> "讨论门\n(展示关键发现)" [shape=diamond];
+    "讨论门\n(展示关键发现)" -> "精炼提取" [label="有反馈"];
+    "精炼提取" -> "WikiLinks 标注\n[wikilinks-annotation.md]";
+    "讨论门\n(展示关键发现)" -> "WikiLinks 标注\n[wikilinks-annotation.md]" [label="✅ 确认"];
```

- [ ] **Step 2: 在"提取"阶段后增加"讨论门"小节**

在现有的"### ③ 提取"之后、"### ④ 冲突解决"之前插入：

```markdown
### ④ 讨论

7. 提取完成后，向用户展示关键发现：

   ```
   📖 文档：{文件名}

   关键发现：
   ├─ 核心实体：[[名称]]（类型/说明）
   ├─ 关联实体：[[名称]]（类型/说明）
   └─ 已有实体更新：[[名称]] 补充信息

   你觉得这个方向对吗？要调整重点还是继续？
   ```

8. 用户可：
   - **确认** → 直接进入下一步
   - **补充**（"定价信息也重要"）→ 精炼提取
   - **修正**（"名称不对"）→ 修正后继续
   - **重定向**（"我更关注 X"）→ 重新搜索相关段落
   - **跳过** → 不处理此文件
```

然后更新后续步骤的编号。

- [ ] **Step 3: 在收尾阶段增加 log.md 追加步骤**

在"### ⑥ 报告"之前插入：

```markdown
### ⑥ 记录

11. **追加 log.md** — 使用 Write 工具在项目根目录 `log.md` 末尾追加：
    ```markdown
    ## [2026-06-25] ingest | 文档标题

    type: ingest
    files: ["raw/article.md"]
    entities:
      - + EntityName (Type)
      - ~ ExistingEntity (updated)
    status: success
    ---
    ```

12. **index-build** — 重建索引（同时更新 index.md）：
    ```bash
    ontomark index-build <project-path>
    ```
```

- [ ] **Step 4: Commit**

```bash
git add skills/ontomark-ingest/SKILL.md
git commit -m "feat: add discussion gate and log.md to ingest skill"
```

---

### Task 3: explore/query/lint 增加 log.md

**Files:**
- Modify: `skills/ontomark-explore/SKILL.md`
- Modify: `skills/ontomark-query/SKILL.md`
- Modify: `skills/ontomark-lint/SKILL.md`

- [ ] **Step 1: explore 收尾追加 log.md**

在 `skills/ontomark-explore/SKILL.md` 的"第四阶段：执行写入"中，在 index-build 之前追加 log.md：

```markdown
13. **追加 log.md** — 使用 Write 工具在 `{projectRoot}/log.md` 末尾追加：
    ```markdown
    ## [2026-06-25] explore | 知识点

    type: explore
    entities:
      - + EntityName (Type)
    status: success
    ---
    ```
14. **重建索引**：
    ```bash
    ontomark index-build <project-path>
    ```
```

- [ ] **Step 2: query 收尾追加 log.md**

在 `skills/ontomark-query/SKILL.md` 的"第四步：展示与存储"中，用户同意存储 Topic 后，在写入页面之后追加 log.md：

```markdown
   用户同意 → 使用 Write 工具创建 Topic 页面
   → **追加 log.md**：
     ```markdown
     ## [2026-06-25] query | 问题摘要

     type: query
     entities:
       - + TopicName (Topic)
     status: success
     ---
     ```
   → **重建索引**：`ontomark index-build <project-path>`
```

- [ ] **Step 3: lint 收尾追加 log.md**

在 `skills/ontomark-lint/SKILL.md` 的"第四步：执行修复"中，在 index-build 之后追加 log.md：

```markdown
   7. 调用 `lint-all` → 验证修复结果
   8. **追加 log.md**：
      ```markdown
      ## [2026-06-25] lint | 修复摘要

      type: lint
      entities:
        - ~ EntityA (updated)
        - + EntityB (created)
      fixes:
        orphans: 2 → 1
        missing: 3 → 0
      status: success
      ---
      ```
```

- [ ] **Step 4: 验证所有技能文件格式一致**

```bash
grep -c 'log.md' skills/ontomark-ingest/SKILL.md skills/ontomark-explore/SKILL.md skills/ontomark-query/SKILL.md skills/ontomark-lint/SKILL.md
# 预期每行输出 > 0
```

- [ ] **Step 5: Commit**

```bash
git add skills/ontomark-explore/SKILL.md skills/ontomark-query/SKILL.md skills/ontomark-lint/SKILL.md
git commit -m "feat: add log.md append to explore, query, lint skills"
```
