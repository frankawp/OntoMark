# OntoMark Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建 OntoMark Skill，将 CLI 命令编排成 LLM Wiki 工作流，支持 Ingest、Query、Lint 三大操作。

**Architecture:** Skill 作为工作流编排层，调用 ontomark CLI 完成原子操作。首次 Ingest 时引导用户设计 ontology，查询时支持答案存回 wiki，Lint 时自动修复孤立页面。

**Tech Stack:** TypeScript, Claude Code Skill, Markdown, ontomark CLI

---

## Files to Create/Modify

```
~/.claude/skills/ontomark/
  SKILL.md                         # 主入口文件 (~120行)
  reference/
    ingest-workflow.md             # Ingest 工作流 (~150行)
    query-workflow.md              # Query 工作流 (~100行)
    lint-workflow.md               # Lint 工作流 (~120行)

src/cli.ts                         # 添加 ingest 子命令
src/index.ts                       # 添加 ingest 方法（可选）
```

---

## Task 1: 添加 CLI ingest 子命令

**Files:**
- Modify: `src/cli.ts:32-50`

**说明：** 设计文档中提到 `/ontomark ingest` 命令，目前 CLI 没有。ingest 本质上是 build 的别名，但语义更清晰。

- [ ] **Step 1: 添加 ingest 命令**

在 `src/cli.ts` 中，在 `extract` 命令之后添加：

```typescript
program
  .command('ingest <project-path>')
  .description('添加源文档并构建 wiki（build 的语义化别名）')
  .option('--raw-path <path>', '指定 raw 目录')
  .option('--wiki-path <path>', '指定 wiki 目录')
  .option('--provider <name>', 'LLM provider (deepseek | openai)', 'deepseek')
  .option('--update', '仅处理新增/变更文件')
  .action(async (projectPath: string, options: { rawPath?: string; wikiPath?: string; provider?: string; update?: boolean }) => {
    await runCommand(projectPath, options, 'build');
  });
```

- [ ] **Step 2: 测试 ingest 命令**

```bash
npx ts-node src/cli.ts --help
```

Expected: 输出中包含 `ingest <project-path>` 命令

- [ ] **Step 3: 提交**

```bash
git add src/cli.ts
git commit -m "feat(cli): 添加 ingest 命令作为 build 的语义化别名"
```

---

## Task 2: 创建 Skill 目录结构

**Files:**
- Create: `~/.claude/skills/ontomark/SKILL.md`
- Create: `~/.claude/skills/ontomark/reference/` 目录

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p ~/.claude/skills/ontomark/reference
```

- [ ] **Step 2: 验证目录创建**

```bash
ls -la ~/.claude/skills/ontomark/
```

Expected: 显示 `reference/` 目录

---

## Task 3: 创建主入口 SKILL.md

**Files:**
- Create: `~/.claude/skills/ontomark/SKILL.md`

- [ ] **Step 1: 创建 SKILL.md**

```markdown
---
name: ontomark
description: Use when building or querying an OntoMark wiki knowledge base. Triggers for ingesting new sources, answering questions about the wiki, or health-checking the knowledge graph.
---

# /ontomark

Ontology-Driven AI Native Wiki Builder - 将文档编译成持久化的知识图谱。

## 核心理念

**Compile Once, Query Many** - 不是查询时合成，而是预先编译知识。

## 三层架构

```
raw/          ← 不可变的原始资料
wiki/         ← LLM 编译的知识层
ontology.yaml ← 知识组织规则
```

## 何时使用

| 用户意图 | 调用 |
|---------|------|
| 添加/更新源文档 | `/ontomark ingest` |
| 查询知识库 | `/ontomark query "<问题>"` |
| 健康检查 | `/ontomark lint` |
| 查看状态 | `/ontomark status` |

## CLI 依赖

本 Skill 需要安装 `ontomark` CLI：

```bash
# 从源码安装
cd /Users/frankliu/Code/OntoMark
npm link

# 或使用 npx ts-node
npx ts-node src/cli.ts --help
```

## 环境变量

```bash
# 必需（二选一）
export DEEPSEEK_API_KEY=sk-xxx
export OPENAI_API_KEY=sk-xxx
```

## 工作流详细说明

- [Ingest 工作流](reference/ingest-workflow.md)
- [Query 工作流](reference/query-workflow.md)
- [Lint 工作流](reference/lint-workflow.md)

## 必须遵循的规则

1. **raw/ 不可修改** - 只能读取，所有修改在 wiki/ 层
2. **needs_review 页面需审核** - 不要直接使用，需人工确认
3. **答案可存回 wiki** - 好的查询答案可编译成新页面
4. **首次 ingest 必须引导 ontology 设计** - 不可使用默认模板

## 常见错误

| 错误 | 解决方案 |
|-----|---------|
| 未设置 API Key | 设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY |
| raw 目录为空 | 先添加源文档到 raw/ |
| wiki 无内容 | 运行 `/ontomark ingest <path>` |
| 找不到实体 | 检查别名或运行 ingest 更新知识库 |
```

- [ ] **Step 2: 验证文件创建**

```bash
cat ~/.claude/skills/ontomark/SKILL.md | head -20
```

Expected: 显示 frontmatter 和标题

---

## Task 4: 创建 Ingest 工作流文档

**Files:**
- Create: `~/.claude/skills/ontomark/reference/ingest-workflow.md`

- [ ] **Step 1: 创建 ingest-workflow.md**

```markdown
# Ingest 工作流

添加新源文档，LLM 提取实体，更新 wiki 知识库。

## 使用方式

```
/ontomark ingest                     # 处理当前目录
/ontomark ingest <path>              # 处理指定目录
/ontomark ingest <path> --update     # 仅处理新增/变更文件
```

## 工作流步骤

**当 ontology.yaml 不存在时，必须先完成 Ontology 发现与设计。**

### Step 1: 检查 ontology.yaml

```bash
ls <project-path>/ontology.yaml 2>/dev/null && echo "存在" || echo "不存在"
```

- 存在 → 跳到 Step 5
- 不存在 → 继续 Step 2

### Step 2: 分析 raw 目录

扫描 raw 目录，随机抽取 3-5 个文件分析：

```bash
# 统计文档数量
find <raw-path> -name "*.md" | wc -l

# 随机抽取文件
find <raw-path> -name "*.md" | shuf | head -5
```

### Step 3: 展示分析结果并引导用户

向用户展示：

```
📋 文档分析结果

文档数量：N 个
文档特点：
  - 领域：[从内容推断]
  - 常见实体类型：[人物、组织、地点、事件...]
```

**必须逐一询问：**

1. **知识使用场景**
   > "你打算如何使用这个知识库？"
   - A. 查询特定实体信息
   - B. 追踪事件发展
   - C. 发现实体关系
   - D. 其他

2. **实体类型定义**
   > "建议以下实体类型，需要调整吗？"
   - 展示建议的 entity_types
   - 等待用户确认或修改

3. **关系类型（可选）**
   > "需要追踪实体间的关系吗？"

### Step 4: 生成 ontology.yaml

根据用户确认生成 ontology.yaml：

```bash
cat > <project-path>/ontology.yaml << 'EOF'
version: "1.0"
entity_types:
  Person:
    description: 人物
    template:
      info:
        - key: role
          label: 角色/职位
  # ... 根据用户确认填充
relations:
  works_for:
    description: 就职于
    from: Person
    to: Organization
EOF
```

**确认后继续：**

> "已生成 ontology.yaml。确认无误后开始构建？"

### Step 5: 执行构建

```bash
ontomark ingest <project-path> --provider deepseek
```

### Step 6: 展示结果

解析输出，展示：

```
✅ 构建完成！

新增实体：N 个
  - Person: 实体名 (来源: 文档.md)
  - Organization: 实体名 (来源: 文档.md)

需审核页面：M 个
  - 实体名：原因

下一步建议：
  1. 运行 `/ontomark lint` 检查知识库健康状态
  2. 审核标记页面后可运行 `/ontomark query` 查询
```

## Ontology 演化

**当用户反馈提取效果不佳时：**

1. 分析问题：遗漏实体、类型错误、字段缺失
2. 提出 ontology 修改建议
3. 确认后更新 ontology.yaml
4. 重新运行 ingest

## 必须遵循的规则

1. **首次 ingest 必须引导 ontology 设计** - 不可使用默认模板
2. **逐一询问，不可跳过** - 确保知识结构符合用户场景
3. **根据反馈演化** - ontology 应随使用场景调整
4. **raw/ 不可修改** - 只能读取，所有修改在 wiki/ 层
```

- [ ] **Step 2: 验证文件创建**

```bash
ls -la ~/.claude/skills/ontomark/reference/
```

Expected: 显示 `ingest-workflow.md`

---

## Task 5: 创建 Query 工作流文档

**Files:**
- Create: `~/.claude/skills/ontomark/reference/query-workflow.md`

- [ ] **Step 1: 创建 query-workflow.md**

```markdown
# Query 工作流

查询 wiki 知识库，综合回答用户问题，可选将答案存回 wiki。

## 使用方式

```
/ontomark query "<问题>"              # 查询知识库
/ontomark query "<问题>" --save       # 查询并将答案存回 wiki
```

## 工作流步骤

### Step 1: 解析用户问题

识别问题类型和涉及的实体：

| 问题类型 | 示例 | 处理方式 |
|---------|------|---------|
| 实体查询 | "X 是谁？" | 单实体 context |
| 关系查询 | "X 和 Y 什么关系？" | 多实体 context |
| 事件查询 | "X 事件的时间线" | 相关实体聚合 |
| 概念查询 | "什么是 X？" | 搜索匹配实体 |

### Step 2: 获取实体上下文

```bash
ontomark context <entity-name> <project-path>
```

对于多实体查询，逐个调用 context。

### Step 3: 综合回答

基于获取的上下文生成回答，格式：

```markdown
## <实体名>

**类型**：Person

**摘要**：
[实体摘要内容]

**相关实体**：
- [[实体A]] - 关系说明
- [[实体B]] - 关系说明

**来源**：
- 文档1.md (line 10)
```

### Step 4: 建议存回 Wiki

**LLM Wiki 核心理念：好的答案应该存回知识库。**

当回答综合了多个实体信息时：

```
这个回答综合了多个实体信息，是否存回 wiki？

建议页面名：Topics/<问题主题>.md

存入后可以：
- 下次直接引用，无需重新综合
- 作为知识积累，持续丰富
```

如用户同意，创建 Topic 页面：

```markdown
---
entity_type: Topic
generated_from:
  - query: "用户原始问题"
  - entities: [Entity1, Entity2]
  - date: 2026-06-12
---

# <主题标题>

[综合回答内容]

## 相关实体
- [[Entity1]]
- [[Entity2]]

## 来源
- [[文档1]]
```

## 无法找到实体时

```
未在 wiki 中找到 "X"。

可能原因：
1. 该实体尚未从 raw 文档中提取
2. 实体名称不同，尝试：[别名建议]
3. 需要先运行 `/ontomark ingest` 更新知识库

是否需要我：
- 在 raw 文档中搜索相关内容？
- 更新 ontology 以支持此实体类型？
```

## 必须遵循的规则

1. **必须引用来源** - 每个回答必须标注 wiki 页面或 raw 文档来源
2. **优先使用 wiki** - 不要重新阅读 raw，使用已编译的知识
3. **建议存回** - 高质量答案主动建议存回 wiki
4. **诚实标识不确定** - 低置信度实体需标注 `需审核`
```

- [ ] **Step 2: 验证文件创建**

```bash
cat ~/.claude/skills/ontomark/reference/query-workflow.md | head -10
```

Expected: 显示标题和使用方式

---

## Task 6: 创建 Lint 工作流文档

**Files:**
- Create: `~/.claude/skills/ontomark/reference/lint-workflow.md`

- [ ] **Step 1: 创建 lint-workflow.md**

```markdown
# Lint 工作流

健康检查 wiki 知识库，发现问题并提出修复建议。

## 使用方式

```
/ontomark lint                      # 检查知识库健康状态
/ontomark lint --fix                # 检查并自动修复可修复的问题
```

## 工作流步骤

### Step 1: 执行 Lint

```bash
ontomark lint <project-path>
```

### Step 2: 解析结果并分类

输出解析：
- `孤立页面` - 无入链的 wiki 页面
- `缺失链接` - 被引用但未创建的实体
- `空页面` - 内容过少的页面
- `低置信度` - confidence < 0.5 的实体
- `需审核` - needs_review: true 的页面

### Step 3: 展示问题

```
📊 Wiki 健康检查结果

总问题数：N 个

🔴 高优先级（需人工处理）
  - 缺失链接：M 个
    - "EntityX" 被 3 个页面引用但无对应 wiki 页面
    
  - 需审核：K 个
    - "EntityY" 存在类型冲突
    
  - 空页面：P 个
    - "EntityZ" 内容少于 3 行

🟡 中优先级（可自动修复）
  - 孤立页面：Q 个
    - Benjamin_Netanyahu
    - Rania_Khalek

是否自动修复中优先级问题？[Y/n]
```

### Step 4: 执行自动修复

**孤立页面修复：**

1. 找到与孤立实体相关的其他页面
2. 在这些页面中添加 `[[(孤立实体)]]` 链接
3. 更新 backlink 部分

```bash
# 示例：在 Organizations/IDF.md 中添加引用
# 找到提到孤立实体的页面
grep -l "孤立实体名" wiki/**/*.md

# 编辑页面添加链接
```

### Step 5: 记录到 log

所有修复操作追加到 `wiki/log.md`：

```markdown
## [2026-06-12] lint --fix

修复孤立页面：3 个
  - 在 Organizations/IDF.md 添加 [[Benjamin_Netanyahu]]
  - 在 Events/Attack.md 添加 [[Rania_Khalek]]
```

## 问题类型与修复方案

| 问题类型 | 严重程度 | 自动修复 | 修复方案 |
|---------|---------|---------|---------|
| 孤立页面 | 中 | ✅ | 添加入链 |
| 缺失链接 | 高 | ❌ | 创建页面或更新引用 |
| 空页面 | 高 | ❌ | 重新提取或人工编辑 |
| 低置信度 | 中 | ❌ | 人工审核 |
| 需审核 | 高 | ❌ | 必须人工确认 |

## 定期 Lint 建议

| 文档规模 | 建议 lint 频率 |
|---------|--------------|
| < 50 个 | 每次 ingest 后 |
| 50-200 个 | 每周一次 |
| > 200 个 | 每次重要更新后 |

## 必须遵循的规则

1. **区分自动/人工修复** - 明确标注哪些可自动修复
2. **高优先级必须展示** - 缺失链接和需审核页面必须处理
3. **修复后验证** - 执行修复后重新运行 lint 确认
4. **记录所有操作** - 每次修复追加到 log.md
```

- [ ] **Step 2: 验证文件创建**

```bash
ls -la ~/.claude/skills/ontomark/reference/
```

Expected: 显示三个 workflow 文件

---

## Task 7: 验证 Skill 可用性

**Files:**
- 无文件修改

- [ ] **Step 1: 验证 Skill 被识别**

启动新的 Claude Code 会话，输入：

```
/ontomark --help
```

Expected: Skill 被加载并显示帮助信息

- [ ] **Step 2: 测试 ingest 工作流**

```
/ontomark ingest tests/markdown/multi_hop_vault
```

Expected: Skill 引导 ontology 设计（如果 ontology.yaml 不存在）或执行构建

- [ ] **Step 3: 测试 query 工作流**

```
/ontomark query "Hamas 是什么组织？"
```

Expected: Skill 调用 context 命令并返回实体信息

- [ ] **Step 4: 测试 lint 工作流**

```
/ontomark lint tests/markdown/multi_hop_vault
```

Expected: Skill 调用 lint 命令并展示问题

---

## Task 8: 提交所有更改

**Files:**
- 无文件修改（git 提交）

- [ ] **Step 1: 检查 git 状态**

```bash
git status --short
```

- [ ] **Step 2: 提交 Skill 文件**

由于 Skill 文件在 `~/.claude/skills/` 目录下，不在项目仓库中，此步骤跳过。

如果需要将 Skill 文档保存到项目仓库：

```bash
mkdir -p docs/skills
cp -r ~/.claude/skills/ontomark docs/skills/
git add docs/skills/
git commit -m "docs: 添加 OntoMark Skill 文档"
```

---

## Summary

| Task | 描述 | 文件 |
|------|------|------|
| 1 | 添加 CLI ingest 子命令 | src/cli.ts |
| 2 | 创建 Skill 目录结构 | ~/.claude/skills/ontomark/ |
| 3 | 创建主入口 SKILL.md | SKILL.md |
| 4 | 创建 Ingest 工作流 | reference/ingest-workflow.md |
| 5 | 创建 Query 工作流 | reference/query-workflow.md |
| 6 | 创建 Lint 工作流 | reference/lint-workflow.md |
| 7 | 验证 Skill 可用性 | - |
| 8 | 提交更改 | - |
