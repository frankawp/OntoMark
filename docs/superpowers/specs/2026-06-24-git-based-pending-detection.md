# Git-Based 待处理文件检测

> 用 git commit hash 替代 MD5 文件 hash，实现增量检测。

## 背景

当前 `raw-status` 工具对 raw 目录下每个 `.md` 文件计算 MD5，与 `processed.json` 中存储的 hash 对比，判断文件是否有变化。这种方式有维护成本：

- 需要维护每个文件的 hash 记录
- 需要单独跟踪 ontology.yaml 的 hash 变化
- 文件 hash 无法关联提交上下文

项目默认在 git 版本管理下，git 本身已经精确记录了文件的变更历史。可以用 git commit hash 替代 MD5 hash。

## 目标

用 git 的 commit hash 作为增量 ingest 的判断依据，移除 MD5 文件 hash 机制。

## 存储简化

**`processed.json` 新格式：**

```json
{
  "lastProcessedHash": "a1b2c3d...",
  "lastProcessedAt": "2026-06-24T00:00:00Z"
}
```

不再存储每个文件的 hash，不再存储 ontologyHash。

## `pending-files` 命令（替代 `raw-status`）

```bash
ontomark pending-files <project-path>
```

返回：

```typescript
interface PendingFilesResult {
  files: string[];           // 需要处理的 raw 文件列表（相对路径）
  total: number;
  ontologyChanged: boolean;  // ontology.yaml 是否在此批次中有变更
  lastHash: string;          // 当前记录的 lastProcessedHash
}
```

### 核心逻辑

1. 读取 `.ontomark/processed.json`，获取 `lastProcessedHash`

2. 如果是首次（无 `lastProcessedHash`）→ 扫描 `raw/` 下所有 `.md` 文件，返回全量列表

3. 如果有 `lastProcessedHash` → 执行 git diff：

```bash
git log <lastProcessedHash>..HEAD \
  --author="$(git config user.email)" \
  --name-only \
  --pretty=format: \
  --diff-filter=ACMR \
  -- 'raw/*.md' 'ontology.yaml'
```

4. 分析输出：
   - 格式化为去重的文件路径列表
   - 若 `ontology.yaml` 在列表中 → `ontologyChanged: true`
   - 过滤出 `raw/*.md` 文件作为待处理列表

5. 若 `git log` 命令失败（如 hash 不存在于历史中，rebase 导致），抛出错误：

```
错误：lastProcessedHash (a1b2c3d) 在当前分支历史中不存在。
可能的原因是 rebase 或 reset 导致提交历史重写。
请确认上次 ingest 的位置后，手动更新 .ontomark/processed.json 中的
lastProcessedHash 为正确的 commit hash，然后重试。
```

不自动 fallback 到全量扫描——全量扫描代价过大，且可能产生重复实体。

### 作者过滤

使用 `git config user.email` 来识别当前用户。只检出当前用户提交的变更。其他人提交的 raw 文件变更会被忽略（他们会在自己的环境中处理）。

首次全量扫描不受作者过滤限制——如果是空仓库初始化，所有文件都需处理。

## `mark-processed` 行为调整

**当前行为：** 逐个读取 raw 文件内容计算 MD5 hash，写入 `processed.json` 的每个文件记录。

**调整后行为：**

```bash
ontomark mark-processed <project-path>
```

内部逻辑：
1. 执行 `git rev-parse HEAD` 获取当前最新 commit hash
2. 读取 `processed.json`
3. 将 `lastProcessedHash` 设为 HEAD hash
4. 写入 `processed.json`

不再需要读文件内容、不再需要 crypto MD5 依赖。

## CLI 更动

- **移除** `raw-status` 命令
- **新增** `pending-files` 命令
- `mark-processed` 行为改为存 HEAD hash
- `ontology-status` 不变（仍需知道实体类型）
- 移除 `raw-status.ts` 文件
- 移除 `crypto` import（不再需要 MD5）

## Skill 工作流调整

### ingest.md

```
第一步：获取上下文

1. 调用 ontology-status → 获取可用实体类型
2. 调用 pending-files → 获取待处理文件列表
```

把 Step 1 中对 `raw-status` 的引用替换为 `pending-files`，其余流程不变（二层三层提取、wiki-write、index-build）。

## 边界情况

| 场景 | 处理 |
|------|------|
| 首次使用（无 lastProcessedHash） | 全量扫描 raw/ 下所有 .md |
| 无新 commit | `files: []`, `total: 0` |
| hash 不存在（rebase / reset） | 抛出错误，提示用户手动修复 |
| 用户改了 git config email | 旧 email 的 commit 不会被检出（可接受） |
| ontology.yaml 和 raw 文件在同一次 commit | 同时检出，`ontologyChanged: true` |
| 空 raw 目录 | `total: 0` |
| 不在 git 仓库中 | 执行 `git rev-parse HEAD` 失败 → 抛出友好错误 |
