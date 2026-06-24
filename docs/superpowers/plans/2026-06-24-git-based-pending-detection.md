# Git-Based Pending Detection 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 用 git commit hash 替代 MD5 文件 hash 检测待处理的 raw 文件。

**方案：** 移除 `raw-status` 命令，新增 `pending-files` 命令。`processed.json` 只存一个 `lastProcessedHash`。`mark-processed` 改为记录 `HEAD` hash 而非逐个文件 MD5。

**涉及文件清单：**

| 操作 | 文件 |
|------|------|
| 删除 | `src/v3/tools/raw-status.ts` |
| 删除 | `tests/v3/tools/raw-status.test.ts` |
| 新建 | `src/v3/tools/pending-files.ts` |
| 新建 | `tests/v3/tools/pending-files.test.ts` |
| 修改 | `src/v3/tools/types.ts` |
| 修改 | `src/v3/tools/mark-processed.ts` |
| 修改 | `src/v3/cli.ts` |
| 修改 | `src/v3/index.ts` |
| 修改 | `tests/v3/tools/types.test.ts` |
| 修改 | `tests/v3/integration.test.ts` |
| 修改 | `.claude/skills/ontomark/ingest.md` |
| 修改 | `.claude/skills/ontomark/SKILL.md` |

---

### Task 1: 更新类型定义（types.ts）

**Files:**
- Modify: `src/v3/tools/types.ts:1-148`

**改动内容：**
1. 删除 `ProcessedFile` 接口
2. 删除 `RawStatusResult` 接口
3. 新增 `PendingFilesResult` 接口
4. 简化 `ProcessedData` 接口（只留 `lastProcessedHash`）

- [ ] **Step 1: 修改 types.ts**

```typescript
// ============ 处理状态 ============

export interface PendingFilesResult {
  files: string[];           // 需要处理的 raw 文件列表（相对路径）
  total: number;
  ontologyChanged: boolean;  // ontology.yaml 是否在此批次中有变更
  lastHash: string;          // 当前记录的 lastProcessedHash
}

// ...（其余接口不变）
```

找到 `// ============ 处理状态 ============` 这一节，将 `ProcessedFile`、`RawStatusResult` 替换为上述 `PendingFilesResult`。

- [ ] **Step 2: 简化 ProcessedData**

将：
```typescript
export interface ProcessedData {
  ontologyHash?: string;
  files: Record<string, { lastProcessed: string; hash: string; }>;
}
```

改为：
```typescript
export interface ProcessedData {
  lastProcessedHash?: string;    // 上次处理的 git commit hash
  lastProcessedAt?: string;      // 上次处理时间
}
```

- [ ] **Step 3: 更新 types.test.ts**

删除 `RawStatusResult` 相关的两个测试用例（`'should define RawStatusResult structure'` 等），保持其余不变。

---

### Task 2: 实现 pending-files 工具

**Files:**
- Create: `src/v3/tools/pending-files.ts`
- Test: `tests/v3/tools/pending-files.test.ts`

- [ ] **Step 1: 编写 pending-files.ts**

```typescript
/**
 * 待处理文件检测 — 基于 git commit hash
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { PendingFilesResult, ProcessedData } from './types';

/**
 * 获取待处理的 raw 文件列表
 *
 * 核心逻辑：
 * 1. 有 lastProcessedHash → git log 对比当前用户提交中的 raw 文件变更
 * 2. 无 lastProcessedHash（首次）→ 全量扫描 raw/ 目录
 * 3. git 命令失败 → 抛出友好错误
 */
export async function pendingFiles(projectPath: string): Promise<PendingFilesResult> {
  const ontomarkDir = path.join(projectPath, '.ontomark');
  const processedPath = path.join(ontomarkDir, 'processed.json');

  // 读取现有记录
  let lastHash = '';
  try {
    const content = await fs.readFile(processedPath, 'utf-8');
    const data: ProcessedData = JSON.parse(content);
    lastHash = data.lastProcessedHash || '';
  } catch {
    // 文件不存在 → 首次使用
  }

  // 验证是否在 git 仓库中
  try {
    execSync('git rev-parse --git-dir', { cwd: projectPath, stdio: 'pipe' });
  } catch {
    throw new Error('当前目录不在 git 仓库中。OntoMark 依赖 git 检测文件变更。');
  }

  // 没有 lastHash → 首次运行，全量扫描
  if (!lastHash) {
    return await fullScan(projectPath);
  }

  // 验证 lastHash 是否在历史中
  try {
    execSync(`git rev-parse --verify ${lastHash}`, { cwd: projectPath, stdio: 'pipe' });
  } catch {
    throw new Error(
      `错误：lastProcessedHash (${lastHash}) 在当前分支历史中不存在。\n` +
      `可能的原因是 rebase 或 reset 导致提交历史重写。\n` +
      `请确认上次 ingest 的位置后，手动更新 .ontomark/processed.json 中的\n` +
      `lastProcessedHash 为正确的 commit hash，然后重试。`
    );
  }

  // 获取当前 git user email
  let userEmail: string;
  try {
    userEmail = execSync('git config user.email', { cwd: projectPath, encoding: 'utf-8' }).trim();
  } catch {
    throw new Error('无法获取 git user.email。请先配置 git: git config user.email "your@email.com"');
  }

  // 执行 git log 找出变更文件
  let output: string;
  try {
    output = execSync(
      `git log ${lastHash}..HEAD ` +
      `--author="${userEmail}" ` +
      `--name-only ` +
      `--pretty=format: ` +
      `--diff-filter=ACMR ` +
      `-- 'raw/*.md' 'ontology.yaml'`,
      { cwd: projectPath, encoding: 'utf-8' }
    );
  } catch {
    // git log 的常见失败：lastHash 比 HEAD 更新（回退到之前的版本）
    throw new Error(
      `错误：无法从 ${lastHash} 获取变更记录。\n` +
      `可能的原因是 HEAD 已回退到 ${lastHash} 之前的版本。\n` +
      `请确认后手动更新 .ontomark/processed.json 中的 lastProcessedHash。`
    );
  }

  // 解析输出：去重、分隔 raw 文件与 ontology.yaml
  const lines = output.split('\n').filter(Boolean);
  const fileSet = new Set(lines);

  const rawFiles: string[] = [];
  let ontologyChanged = false;

  for (const file of fileSet) {
    if (file === 'ontology.yaml') {
      ontologyChanged = true;
    } else if (file.startsWith('raw/') && file.endsWith('.md')) {
      rawFiles.push(file);
    }
  }

  return {
    files: rawFiles,
    total: rawFiles.length,
    ontologyChanged,
    lastHash,
  };
}

/**
 * 全量扫描 raw/ 目录下所有 .md 文件
 */
async function fullScan(projectPath: string): Promise<PendingFilesResult> {
  const rawDir = path.join(projectPath, 'raw');
  const files: string[] = [];

  // 获取当前 HEAD hash
  let lastHash = '';
  try {
    lastHash = execSync('git rev-parse HEAD', { cwd: projectPath, encoding: 'utf-8' }).trim();
  } catch {
    // 仓库可能没有任何 commit，这是首次初始化的情况
  }

  async function scanDir(dir: string, prefix: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = `${prefix}${entry.name}`;
        if (entry.isDirectory()) {
          await scanDir(fullPath, `${relPath}/`);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(relPath);
        }
      }
    } catch {
      // 目录不存在
    }
  }

  await scanDir(rawDir, 'raw/');

  // 首次全量扫描，检测 ontology.yaml 是否存在（被新创建也视为变化）
  let ontologyChanged = false;
  try {
    await fs.access(path.join(projectPath, 'ontology.yaml'));
    ontologyChanged = true;
  } catch {
    // 不存在
  }

  return {
    files,
    total: files.length,
    ontologyChanged,
    lastHash,
  };
}
```

- [ ] **Step 2: 编写 pending-files.test.ts**

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { pendingFiles } from '../../../src/v3/tools/pending-files';

describe('pending-files', () => {
  let tempDir: string;
  let rawDir: string;
  let ontomarkDir: string;

  function git(args: string): string {
    return execSync(`git ${args}`, { cwd: tempDir, encoding: 'utf-8' }).trim();
  }

  function writeFile(relPath: string, content: string): Promise<void> {
    const dir = path.dirname(path.join(tempDir, relPath));
    return fs.mkdir(dir, { recursive: true }).then(() =>
      fs.writeFile(path.join(tempDir, relPath), content, 'utf-8')
    );
  }

  function gitCommitAll(msg: string): void {
    git('add -A');
    git(`commit -m "${msg}"`);
  }

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
    rawDir = path.join(tempDir, 'raw');
    ontomarkDir = path.join(tempDir, '.ontomark');
    await fs.mkdir(rawDir, { recursive: true });
    await fs.mkdir(ontomarkDir, { recursive: true });

    // 初始化 git 仓库
    git('init');
    git('config user.email test@ontomark.dev');
    git('config user.name Tester');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return all files on first run (no lastHash)', async () => {
    await writeFile('raw/a.md', 'content A');
    await writeFile('raw/sub/b.md', 'content B');
    await writeFile('raw/ignore.txt', 'not markdown');
    gitCommitAll('first commit');

    const result = await pendingFiles(tempDir);
    expect(result.total).toBe(2);
    expect(result.files).toContain('raw/a.md');
    expect(result.files).toContain('raw/sub/b.md');
    expect(result.files).not.toContain('raw/ignore.txt');
  });

  it('should return empty when no new commits', async () => {
    await writeFile('raw/a.md', 'content');
    gitCommitAll('first commit');

    // 模拟已经处理过
    const headHash = git('rev-parse HEAD');
    await fs.writeFile(
      path.join(ontomarkDir, 'processed.json'),
      JSON.stringify({ lastProcessedHash: headHash }),
      'utf-8'
    );

    const result = await pendingFiles(tempDir);
    expect(result.total).toBe(0);
    expect(result.files).toEqual([]);
  });

  it('should detect new raw files after a commit', async () => {
    await writeFile('raw/a.md', 'content');
    gitCommitAll('first commit');
    const headHash = git('rev-parse HEAD');
    await fs.writeFile(
      path.join(ontomarkDir, 'processed.json'),
      JSON.stringify({ lastProcessedHash: headHash }),
      'utf-8'
    );

    // 第二个 commit：新增文件
    await writeFile('raw/b.md', 'new file');
    gitCommitAll('add b');

    const result = await pendingFiles(tempDir);
    expect(result.total).toBe(1);
    expect(result.files).toContain('raw/b.md');
  });

  it('should detect modified raw files after a commit', async () => {
    await writeFile('raw/a.md', 'content');
    gitCommitAll('first commit');
    const headHash = git('rev-parse HEAD');
    await fs.writeFile(
      path.join(ontomarkDir, 'processed.json'),
      JSON.stringify({ lastProcessedHash: headHash }),
      'utf-8'
    );

    await writeFile('raw/a.md', 'updated content');
    gitCommitAll('update a');

    const result = await pendingFiles(tempDir);
    expect(result.total).toBe(1);
    expect(result.files).toContain('raw/a.md');
  });

  it('should flag ontologyChanged when ontology.yaml changes', async () => {
    await writeFile('raw/a.md', 'content');
    gitCommitAll('first commit');
    const headHash = git('rev-parse HEAD');
    await fs.writeFile(
      path.join(ontomarkDir, 'processed.json'),
      JSON.stringify({ lastProcessedHash: headHash }),
      'utf-8'
    );

    await writeFile('ontology.yaml', 'version: "1.0"');
    gitCommitAll('add ontology');

    const result = await pendingFiles(tempDir);
    expect(result.ontologyChanged).toBe(true);
  });

  it('should not detect other authors commits', async () => {
    await writeFile('raw/a.md', 'content');
    gitCommitAll('first commit');
    const headHash = git('rev-parse HEAD');
    await fs.writeFile(
      path.join(ontomarkDir, 'processed.json'),
      JSON.stringify({ lastProcessedHash: headHash }),
      'utf-8'
    );

    // 用其他人的身份提交
    await writeFile('raw/b.md', 'other author file');
    git('config user.email other@example.com');
    gitCommitAll('add by other');
    // 恢复当前用户
    git('config user.email test@ontomark.dev');

    const result = await pendingFiles(tempDir);
    expect(result.total).toBe(0);
  });

  it('should throw error on invalid lastHash (rebase scenario)', async () => {
    await writeFile('raw/a.md', 'content');
    gitCommitAll('first commit');
    await fs.writeFile(
      path.join(ontomarkDir, 'processed.json'),
      JSON.stringify({ lastProcessedHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' }),
      'utf-8'
    );

    await expect(pendingFiles(tempDir)).rejects.toThrow('lastProcessedHash');
  });

  it('should throw error when not in git repo', async () => {
    // 删除 .git 目录
    await fs.rm(path.join(tempDir, '.git'), { recursive: true, force: true });
    await expect(pendingFiles(tempDir)).rejects.toThrow('git 仓库');
  });
});
```

- [ ] **Step 3: 运行测试验证**

```bash
npx jest tests/v3/tools/pending-files.test.ts --no-coverage --verbose
```

Expected: 8 tests pass.

---

### Task 3: 简化 mark-processed 为只记录 HEAD hash

**Files:**
- Modify: `src/v3/tools/mark-processed.ts`

- [ ] **Step 1: 重写 mark-processed.ts**

```typescript
/**
 * 标记文件已处理 — 记录当前 HEAD hash
 * 不再计算 MD5，依赖 git commit hash 判断变更
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { ProcessedData } from './types';

/**
 * 标记当前 HEAD 为已处理状态
 */
export async function markProcessed(projectPath: string): Promise<void> {
  const ontomarkDir = path.join(projectPath, '.ontomark');
  const processedPath = path.join(ontomarkDir, 'processed.json');

  // 确保目录存在
  await fs.mkdir(ontomarkDir, { recursive: true });

  // 获取当前 HEAD hash
  let headHash: string;
  try {
    headHash = execSync('git rev-parse HEAD', { cwd: projectPath, encoding: 'utf-8' }).trim();
  } catch {
    throw new Error('无法获取 git HEAD hash。请确保项目在 git 仓库中。');
  }

  // 读取现有数据
  let data: ProcessedData = {};
  try {
    const content = await fs.readFile(processedPath, 'utf-8');
    data = JSON.parse(content);
  } catch {
    // 文件不存在
  }

  // 更新记录
  data.lastProcessedHash = headHash;
  data.lastProcessedAt = new Date().toISOString();

  // 写入
  await fs.writeFile(processedPath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 兼容旧接口（不再需要文件参数）
 */
export async function markProcessedBatch(projectPath: string, _filePaths?: string[]): Promise<void> {
  return markProcessed(projectPath);
}
```

- [ ] **Step 2: 重写 mark-processed.test.ts**

覆盖两个场景：有 processed.json 时更新 hash、无 processed.json 时新建并记录。

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { markProcessed } from '../../../src/v3/tools/mark-processed';

describe('mark-processed', () => {
  let tempDir: string;
  let ontomarkDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ontomark-test-'));
    ontomarkDir = path.join(tempDir, '.ontomark');
    await fs.mkdir(ontomarkDir, { recursive: true });
    // 初始化 git
    execSync('git init', { cwd: tempDir });
    execSync('git config user.email test@test.com', { cwd: tempDir });
    execSync('git config user.name Tester', { cwd: tempDir });
    // 初始 commit
    await fs.writeFile(path.join(tempDir, 'README.md'), '# test', 'utf-8');
    execSync('git add -A', { cwd: tempDir });
    execSync('git commit -m "init"', { cwd: tempDir });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should create processed.json with HEAD hash', async () => {
    await markProcessed(tempDir);
    const content = await fs.readFile(path.join(ontomarkDir, 'processed.json'), 'utf-8');
    const data = JSON.parse(content);
    expect(data.lastProcessedHash).toBeDefined();
    expect(data.lastProcessedHash.length).toBe(40);
    expect(data.lastProcessedAt).toBeDefined();
  });

  it('should update existing processed.json', async () => {
    // 先执行一次
    await markProcessed(tempDir);
    const firstHash = JSON.parse(
      await fs.readFile(path.join(ontomarkDir, 'processed.json'), 'utf-8')
    ).lastProcessedHash;

    // 再提交一个空 commit
    execSync('git commit --allow-empty -m "second"', { cwd: tempDir });
    await markProcessed(tempDir);

    const secondData = JSON.parse(
      await fs.readFile(path.join(ontomarkDir, 'processed.json'), 'utf-8')
    );
    // hash 应该变了
    expect(secondData.lastProcessedHash).not.toBe(firstHash);
  });

  it('should throw error when not in git repo', async () => {
    await fs.rm(path.join(tempDir, '.git'), { recursive: true, force: true });
    await expect(markProcessed(tempDir)).rejects.toThrow();
  });
});
```

---

### Task 4: 更新 CLI（移除 raw-status，新增 pending-files，简化 mark-processed）

**Files:**
- Modify: `src/v3/cli.ts`

- [ ] **Step 1: 修改 cli.ts 的 import**

移除：
```typescript
import { rawStatus } from './tools/raw-status';
```

新增：
```typescript
import { pendingFiles } from './tools/pending-files';
```

- [ ] **Step 2: 移除 raw-status 命令块**

删除第 79-95 行的整个 `raw-status` command 定义：

```typescript
// 文件状态工具
program
  .command('raw-status <project-path>')
  // ... 整个块删除
```

- [ ] **Step 3: 新增 pending-files 命令**

在 `skill-uninstall` 命令之后、`wiki-status` 之前插入：

```typescript
// 待处理文件检测
program
  .command('pending-files <project-path>')
  .description('检测待处理的 raw 文件（基于 git commit hash）')
  .action(async (projectPath: string) => {
    try {
      const result = await pendingFiles(projectPath);
      console.log(JSON.stringify(result, null, 2));
    } catch (err: any) {
      console.error(`错误: ${err.message}`);
      process.exit(1);
    }
  });
```

- [ ] **Step 4: 简化 mark-processed 命令**

替换 mark-processed 命令为无参数版本：

```typescript
program
  .command('mark-processed <project-path>')
  .description('标记当前 HEAD 为已处理状态')
  .action(async (projectPath: string) => {
    try {
      await markProcessed(projectPath);
      console.log('✅ 已标记为已处理');
    } catch (err: any) {
      console.error(`错误: ${err.message}`);
      process.exit(1);
    }
  });
```

---

### Task 5: 更新 exports 和集成测试

**Files:**
- Modify: `src/v3/index.ts`
- Modify: `tests/v3/integration.test.ts`

- [ ] **Step 1: 更新 index.ts**

```typescript
export * from './tools/types';
export { pendingFiles } from './tools/pending-files';  // rawStatus 替换为 pendingFiles
export { wikiStatus } from './tools/wiki-status';
// ... 其余不变
```

移除 `rawStatus` 导出，新增 `pendingFiles` 导出。

- [ ] **Step 2: 更新 integration.test.ts**

将 `rawStatus` 替换为 `pendingFiles`。
在 import 中：`rawStatus` → `pendingFiles`
在测试中：`rawStatus(tempDir)` → `pendingFiles(tempDir)`

注意测试需要 git repository，给 integration test 添加 git init 步骤：

```typescript
import { execSync } from 'child_process';

beforeEach(async () => {
  // ... 现有代码
  execSync('git init', { cwd: tempDir });
  execSync('git config user.email test@ontomark.dev', { cwd: tempDir });
  execSync('git config user.name Tester', { cwd: tempDir });
});
```

`rawAfter.pending` → `rawAfter.total`（新的 pending-files 没有 `pending` 字段，用 `total` 代替）。
创建 ontology.yaml 也要在 git commit 之后才有效。

完整集成测试替换：

```typescript
it('should complete full workflow', async () => {
  // 1. 创建 ontology 并提交
  await fs.writeFile(
    path.join(tempDir, 'ontology.yaml'),
    `version: "1.0"\nentity_types:\n  Person:\n    description: 人物\n`
  );
  execSync('git add -A', { cwd: tempDir });
  execSync('git commit -m "init"', { cwd: tempDir });

  const ontology = await ontologyStatus(tempDir);
  expect(ontology.exists).toBe(true);

  // 2. 添加 raw 文件并提交
  await fs.writeFile(path.join(rawDir, 'test.md'), '# Test Document\n\nContent about John Doe.');
  execSync('git add -A', { cwd: tempDir });
  execSync('git commit -m "add raw"', { cwd: tempDir });

  const pending = await pendingFiles(tempDir);
  expect(pending.total).toBe(1);

  // 3. 写入 wiki
  const writeResult = await wikiWrite({
    projectPath: tempDir,
    entities: [{
      canonical: 'John Doe',
      type: 'Person',
      content: 'Test content',
      sources: [{ file: 'raw/test.md', lines: [1] }],
      isUpdate: false,
    }],
  });
  expect(writeResult.results[0].success).toBe(true);

  // 4. 标记已处理
  await markProcessed(tempDir);

  const pendingAfter = await pendingFiles(tempDir);
  expect(pendingAfter.total).toBe(0);

  // 5-8. 其余不变
  // ...
});
```

---

### Task 6: 删除 raw-status 旧文件

**Files:**
- Delete: `src/v3/tools/raw-status.ts`
- Delete: `tests/v3/tools/raw-status.test.ts`

- [ ] **Step 1: 删除文件**

```bash
rm src/v3/tools/raw-status.ts tests/v3/tools/raw-status.test.ts
```

---

### Task 7: 清理 types.test.ts 中已删除类型的引用

**Files:**
- Modify: `tests/v3/tools/types.test.ts`

- [ ] **Step 1: 删除 RawStatusResult 相关测试**

从 import 中移除 `RawStatusResult`。
删除 `'should define RawStatusResult structure'` 测试用例。

---

### Task 8: 更新 Skill 文档

**Files:**
- Modify: `.claude/skills/ontomark/ingest.md`
- Modify: `.claude/skills/ontomark/SKILL.md`

- [ ] **Step 1: 更新 ingest.md**

将：
```
2. 调用 raw-status → 获取待处理文件列表
```
改为：
```
2. 调用 pending-files → 获取待处理文件列表
```

- [ ] **Step 2: 更新 SKILL.md**

将 `raw-status` 条目替换为 `pending-files`：

```markdown
# 获取待处理文件
ontomark pending-files <project-path>
# 返回: { files: string[], total: number, ontologyChanged: boolean, lastHash: string }
```

更新"增量处理机制"说明：

```markdown
**增量处理机制**：
- `ontologyChanged: true` 表示 ontology.yaml 在此批次中有变更
- `total` 表示需要处理的文件数量
- 变更检测基于 git commit hash
```

删除 mark-processed 的文件参数用法，改为：

```markdown
### 标记处理

```bash
# 标记当前 HEAD 为已处理
ontomark mark-processed <project-path>
```
```

---

### Task 9: 全量测试验证

- [ ] **Step 1: 运行全量测试**

```bash
npx jest --no-coverage --verbose
```

Expected: 所有测试通过。

- [ ] **Step 2: 编译验证**

```bash
npx tsc
```

Expected: 无错误。

---

### Task 10: 清理不再需要的依赖

- [ ] **Step 1: 检查 crypto 是否还在使用**

```bash
grep -r "crypto" src/ --include="*.ts"
```

如果只有 `ontology-status.ts` 中使用（计算 ontology.hash 字段），则 `crypto` 保留——`ontology-status` 不变。
确认 `mark-processed.ts` 和 `raw-status.ts`（已删除）不再 import crypto。

- [ ] **Step 2: 提交**

```bash
git add -A
git commit -m "feat: 基于 git commit hash 的增量检测，移除 MD5 hash 机制

- 新增 pending-files 命令替代 raw-status
- pending-files 通过 git log 检测当前用户提交中的 raw 文件变更
- mark-processed 简化，只记录 HEAD hash 而非逐个文件 MD5
- processed.json 格式简化，只存 lastProcessedHash
- rebase 场景抛出友好错误，不自动 fallback
- 更新 Skill 文档中的命令引用
- 删除 raw-status.ts 及对应测试
- 新增 pending-files.test.ts 覆盖全量扫描、增量、作者过滤、rebase 错误等场景

Co-Authored-By: Claude <noreply@anthropic.com>"
```
