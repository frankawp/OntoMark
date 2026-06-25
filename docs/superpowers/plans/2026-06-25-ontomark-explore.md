# ontomark-explore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建 `ontomark-explore` 知识点驱动探索技能，更新根技能路由

**Architecture:** 新增一个独立子技能 `skills/ontomark-explore/SKILL.md`，复用 `ontomark-ingest/reference/` 中的提取/标注/冲突处理参考文件。在根技能 `skills/ontomark/SKILL.md` 中增加一行路由。

**Tech Stack:** 纯 Markdown 技能文件，无代码依赖。

## Global Constraints

- 技能文件放在 `skills/ontomark-explore/SKILL.md`
- 不新建 reference 文件，引用 `skills/ontomark-ingest/reference/` 下已有的文件
- all CLI commands must match actual `ontomark` CLI commands exactly

---

### Task 1: 更新根技能路由

**Files:**
- Modify: `skills/ontomark/SKILL.md`

**Interfaces:**
- Consumes: 无
- Produces: `/ontomark explore` 和 `/ontomark-explore` 可路由到新技能

- [ ] **Step 1: 在意图识别表中增加 Explore 行**

在 `skills/ontomark/SKILL.md` 的"意图识别"表格中增加一行：

```diff
 | 检查/lint/健康/孤立 | Lint | 调用 Skill: `ontomark-lint` |
+| explore/探索/知识点/搜索/了解 | Explore | 调用 Skill: `ontomark-explore` |
```

- [ ] **Step 2: 验证**

```bash
cd /path/to/OntoMark
grep -n 'ontomark-explore' skills/ontomark/SKILL.md
# 预期输出：一行包含 ontomark-explore 的行
```

- [ ] **Step 3: Commit**

```bash
git add skills/ontomark/SKILL.md
git commit -m "feat: add explore routing to root skill"
```

---

### Task 2: 创建 ontomark-explore 技能

**Files:**
- Create: `skills/ontomark-explore/SKILL.md`
- Create: `skills/ontomark-explore/reference/`（占位，实际引用 ingest 的 reference）

**Interfaces:**
- Consumes: `skills/ontomark-ingest/reference/entity-extraction.md`, `skills/ontomark-ingest/reference/wikilinks-annotation.md`, `skills/ontomark-ingest/reference/conflict-resolution.md`
- Produces: 完整的知识点探索子技能

- [ ] **Step 1: 创建技能目录**

```bash
mkdir -p skills/ontomark-explore
```

- [ ] **Step 2: 创建 `skills/ontomark-explore/SKILL.md`**

```markdown
---
name: ontomark-explore
description: Use when exploring knowledge points from raw documents through conversation. Triggered by user keywords: explore/探索/知识点/搜索/了解, or when user mentions a topic of interest that may exist in raw documents.
---

# Explore 工作流

> 从用户提出的知识点出发，在 raw 中探索相关内容，对话确认后写入 wiki。

**前置条件**：项目已通过 `/ontomark-init` 初始化，存在 `.ontomark/config.json` 和 `ontology.md`。

## 工作流

### 第一阶段：上下文构建

1. **Read** `.ontomark/config.json` — 获取 `inputDirs` 和 `outputDir`
2. **Read** `ontology.md` — 获取知识维度定义
3. 查询 wiki 已有内容：
   ```bash
   ontomark wiki-status <project-path>
   ontomark index-query <project-path> "<用户知识点关键词>" --fuzzy
   ```

### 第二阶段：探索 raw

4. 从用户知识点中提取搜索关键词，在 inputDirs 中搜索：
   ```bash
   grep -ril "<关键词1>\|<关键词2>" <inputDir>/ 2>/dev/null
   ```
   - 搜索所有 inputDir
   - 多个关键词用 `\|` 连接
   - 优先搜索 `.md` 文件

5. **Read** 匹配的文件，理解内容：
   - 匹配文件 ≤ 3 → 逐个读全文
   - 匹配文件 > 3 → 先读前几行判断相关性，筛选后再精读

6. 判断文件与知识点的相关性，筛选出真正相关的文件和内容片段

### 第三阶段：建议与确认

7. 向用户展示发现：

   ```
   📖 关于"<知识点>"的发现：

   相关文件（{N} 个）：
   ├─ <path1> — <摘要>
   └─ <path2> — <摘要>

   与现有 wiki 的关联：
   ├─ 已有 [[<相关实体>]]
   └─ 建议新增实体：
      ├─ <名称>（<类型>）— <依据>
      └─ <名称>（<类型>）— <依据>

   是否挖掘这个知识点？
   ```

8. 用户可：
   - **接受** → 进入执行阶段
   - **提出新方向** → 回到阶段二重新搜索
   - **补充信息** → AI 调整理解后继续

### 第四阶段：执行写入

完全复用 `ontomark-ingest` 的写入流程（参考 `skills/ontomark-ingest/reference/`）：

9. **实体提取** — 参考 [entity-extraction.md](reference/entity-extraction.md) 的三层策略
10. **WikiLinks 标注** — 参考 [wikilinks-annotation.md](reference/wikilinks-annotation.md)
11. **冲突解决** — 参考 [conflict-resolution.md](reference/conflict-resolution.md)
12. **Write** 实体页面到 `{outputDir}/{EntityType}/{CanonicalName}.md`
13. **标记已处理**：
    ```bash
    ontomark mark-processed <project-path>
    ```
14. **重建索引**：
    ```bash
    ontomark index-build <project-path>
    ```

### 第五阶段：循环探索

15. 写入完成后询问用户：

    ```
    ✅ 已写入 [[<实体>]] 到 wiki。

    要基于这个知识点继续探索关联知识吗？
    A. 继续探索 <关联方向>
    B. 探索其他方向
    C. 完成
    ```

---

## 触发方式

| 方式 | 示例 |
|------|------|
| 显式调用 | `/ontomark-explore <知识点>` |
| 对话触发 | 用户提到某个话题，AI 主动问"需要深入探索这个知识点吗？" |
| 主技能路由 | `/ontomark explore` → 根技能分发到此技能 |

---

## CLI 命令参考

| 命令 | 作用 |
|------|------|
| `ontomark wiki-status <path>` | 查看 wiki 整体状况 |
| `ontomark index-query <path> <name> [--fuzzy]` | 查询实体是否存在 |
| `ontomark mark-processed <path>` | 标记 HEAD 为已处理 |
| `ontomark index-build <path>` | 重建索引 |

write 操作：使用 **Write 工具** 直接写入 Markdown 文件（格式参考 `ontomark-ingest` 技能的实体页面格式章节）。

---

## 搜索建议

| 场景 | 搜索策略 |
|------|---------|
| 知识点明确（如"DeepSeek-Coder"） | 直接搜名称 + 别名 |
| 知识点模糊（如"AI 编程工具"） | 拆解为多个关键词搜索 |
| 知识点宽泛（如"中国科技"） | 追问用户具体方向 |
| 搜索结果为空 | 尝试近义词、英文名、缩写再搜 |
| 搜索文件过多（>10） | 先读文件开头，筛选后再精读 |

---

## 错误处理

| 场景 | 处理 |
|------|------|
| `.ontomark/config.json` 不存在 | 提示运行 `/ontomark-init`，中止 |
| `ontology.md` 不存在 | 提示运行 `/ontomark-init`，中止 |
| raw 中未匹配到任何文件 | 告诉用户未找到相关内容，建议不同关键词 |
| 用户提出新方向 | 重置搜索，重新探索 |
| 写入失败 | 检查路径和权限 |
```

- [ ] **Step 3: 验证文件结构**

```bash
ls -la skills/ontomark-explore/
# 预期输出：SKILL.md 存在
```

- [ ] **Step 4: 验证根技能路由**

```bash
grep -n 'explore\|ontomark-explore' skills/ontomark/SKILL.md
# 预期输出：路由表和分发规则中正确引用
```

- [ ] **Step 5: Commit**

```bash
git add skills/ontomark-explore/ skills/ontomark/SKILL.md
git commit -m "feat: create ontomark-explore knowledge-point exploration skill"
```
