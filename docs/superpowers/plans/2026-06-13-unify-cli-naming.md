# 统一 CLI 命名为 ontomark 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 V3 CLI 命令统一命名为 `ontomark`，替代当前的 `ontomark-v3`

**Architecture:** 更新 package.json 的 bin 配置，将 V3 CLI 设为默认 `ontomark` 命令，V2 CLI 改为 `ontomark-v2` 作为兼容保留

**Tech Stack:** Node.js, TypeScript, npm

---

## 文件结构

```
修改文件：
- package.json           # 更新 bin 配置
- om3                    # 重命名为 ontomark
- .claude/skills/ontomark/SKILL.md  # 更新 CLI 工具速查表
```

---

### Task 1: 更新 package.json bin 配置

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 更新 bin 配置**

```json
{
  "bin": {
    "ontomark": "./dist/v3/cli.js",
    "ontomark-v2": "./dist/cli.js"
  }
}
```

- [ ] **Step 2: 验证 package.json 语法**

Run: `cat package.json | jq '.bin'`
Expected:
```json
{
  "ontomark": "./dist/v3/cli.js",
  "ontomark-v2": "./dist/cli.js"
}
```

- [ ] **Step 3: 提交**

```bash
git add package.json
git commit -m "chore: 统一 CLI 命名为 ontomark，V2 改为 ontomark-v2"
```

---

### Task 2: 重命名快捷脚本

**Files:**
- Rename: `om3` → `ontomark`

- [ ] **Step 1: 重命名文件**

```bash
mv om3 ontomark
```

- [ ] **Step 2: 验证脚本可用**

Run: `./ontomark --help`
Expected: 显示帮助信息，以 `ontomark-v3` 开头（暂时）

- [ ] **Step 3: 提交**

```bash
git add om3 ontomark
git commit -m "chore: 重命名快捷脚本 om3 为 ontomark"
```

---

### Task 3: 更新 SKILL.md CLI 工具速查表

**Files:**
- Modify: `.claude/skills/ontomark/SKILL.md`

- [ ] **Step 1: 更新 CLI 工具速查表**

将：
```markdown
## CLI 工具速查

| 工具 | 用途 |
|-----|------|
| `ontology-status` | 获取可用实体类型 |
| `raw-status` | 获取待处理文件 |
| `wiki-write` | 写入 wiki 页面 |
| `mark-processed` | 标记文件已处理 |
| `index-build` | 构建实体索引 |
| `index-query` | 查询实体是否存在 |
| `lint-all` | 检查 wiki 健康状态 |
```

改为：
```markdown
## CLI 工具速查

调用方式：`./ontomark <command> <project-path>`

| 命令 | 用途 |
|-----|------|
| `ontology-status` | 获取可用实体类型 |
| `raw-status` | 获取待处理文件 |
| `wiki-write` | 写入 wiki 页面 |
| `mark-processed` | 标记文件已处理 |
| `index-build` | 构建实体索引 |
| `index-query` | 查询实体是否存在 |
| `lint-all` | 检查 wiki 健康状态 |

示例：
```bash
./ontomark ontology-status tests/markdown/multi_hop_vault
./ontomark raw-status tests/markdown/multi_hop_vault
./ontomark index-build tests/markdown/multi_hop_vault
```
```

- [ ] **Step 2: 提交**

```bash
git add .claude/skills/ontomark/SKILL.md
git commit -m "docs(skill): 更新 CLI 工具速查表，添加调用方式说明"
```

---

### Task 4: 更新 cli.ts 名称显示

**Files:**
- Modify: `src/v3/cli.ts`

- [ ] **Step 1: 更新 CLI 名称**

将：
```typescript
program
  .name('ontomark-v3')
  .description('OntoMark V3 - Atomic CLI Tools')
  .version('3.0.0');
```

改为：
```typescript
program
  .name('ontomark')
  .description('OntoMark - Ontology-Driven Knowledge Base Builder')
  .version('3.0.0');
```

- [ ] **Step 2: 重新编译**

Run: `npx tsc src/v3/cli.ts src/v3/index.ts src/v3/tools/*.ts --outDir dist/v3 --esModuleInterop --moduleResolution node --module commonjs --skipLibCheck --declaration --target es2020`

Expected: 无错误输出

- [ ] **Step 3: 验证更新**

Run: `./ontomark --help`
Expected: 显示帮助信息，以 `ontomark` 开头

- [ ] **Step 4: 提交**

```bash
git add src/v3/cli.ts dist/v3/cli.js
git commit -m "feat(cli): 更新 CLI 名称为 ontomark"
```

---

### Task 5: 最终验证

**Files:**
- 无新建文件

- [ ] **Step 1: 验证命令可用**

Run: `./ontomark --help`
Expected: 显示 ontomark 帮助

- [ ] **Step 2: 验证所有子命令**

Run: `./ontomark --help | grep -E "^  [a-z-]+"`
Expected:
```
  ontology-status  查询 ontology 状态
  raw-status       查询 raw 文件状态
  wiki-status      查询 wiki 文件状态
  mark-processed   标记文件已处理
  wiki-write       写入 wiki 页面
  index-build      构建实体索引
  index-query      查询实体索引
  lint-all         综合检查
  help             display help for command
```

- [ ] **Step 3: 提交所有更改（如有遗漏）**

```bash
git status
git add -A
git commit -m "chore: 完成统一 CLI 命名为 ontomark" || echo "No changes to commit"
```

---

## Self-Review

### 1. Spec Coverage

| 规格要求 | 任务 |
|---------|------|
| CLI 命名为 ontomark | Task 1, 4 ✅ |
| V2 CLI 保留兼容 | Task 1 ✅ |
| 快捷脚本统一 | Task 2 ✅ |
| Skill 文档更新 | Task 3 ✅ |

### 2. Placeholder Scan

- ✅ 无 TBD、TODO
- ✅ 所有代码块完整
- ✅ 所有命令可执行

### 3. Type Consistency

- ✅ package.json bin 路径与编译输出一致
- ✅ CLI 名称在所有文件中一致

---

**计划完成。准备执行。**
