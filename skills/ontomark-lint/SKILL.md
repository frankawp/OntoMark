---
name: ontomark-lint
description: 检查 wiki 知识库健康状态。当用户说"检查/lint/健康/孤立"时由 ontomark 主技能分发。
---

# Lint 工作流

> 检查 wiki 健康状态，发现问题并建议修复。

## 触发条件

- 用户输入：`/ontomark` + 含有"检查/lint/健康/孤立"等关键词
- 或显式调用：`/ontomark-lint`
- 或由 `/ontomark` 主技能分发

## CLI 调用方式

```bash
ontomark <command> <project-path>
```

### 健康检查

```bash
# 完整检查
ontomark lint-all <project-path>
# 返回: { orphans, missing, empty, totalIssues, details? }
```

### Wiki 写入

使用 Write 工具直接写入 Markdown 文件修复（格式见 ingest 技能"写入实体页面"章节）。

### 索引操作

```bash
ontomark index-build <project-path>
ontomark index-query <project-path> <name> [--fuzzy]
```

## 工作流程

### 第一步：获取问题列表

1. 调用 `lint-all` → 获取所有问题
   - `orphans`：孤立页面（无入链）
   - `missing`：缺失链接（引用不存在实体）
   - `empty`：空内容页面

### 第二步：分析严重程度

2. 按严重程度分类：

   🔴 **高优先级**：
   - 缺失链接被多个页面引用（影响范围 > 1）
   - 核心实体页面为空（canonical/status 类实体）

   🟡 **中优先级**：
   - 孤立页面（有价值但未被引用）
   - 空页面（内容少于 50 字符）

   🟢 **低优先级**：
   - 少量孤立页面（< 3 个）
   - 单一缺失链接

### 第三步：展示报告

3. 按优先级展示问题列表
4. 询问用户：

   ```
   🔧 基础检查完成：发现 X 个结构问题。

   要跑一次深度语义检查吗？会读取 wiki 内容分析：
     ✓ 缺失 WikiLinks — 已有页面中应链未链的实体提及
     ✓ 页面间矛盾 — 对比关联实体的信息是否一致
     ✓ 知识缺口 — 被频繁提及但没有独立页面的概念
     ✓ 探索方向 — 基于当前 wiki 建议可深入的方向

   这需要读取相关实体页面进行分析。(y/N)
   ```

### 第四步：深度检查（可选）

5. 用户同意后，执行深度语义检查：

   **① 缺失 WikiLinks**
   遍历 wiki 页面，扫描正文中出现的实体名称（canonical + aliases）是否已链接：
   ```
   🟡 缺失 WikiLinks（2 处）：
     · [[ChatGPT]] 中 "GPT-4" 应链接到 [[GPT-4]]
     · [[Sam Altman]] 中 "Microsoft" 应链接到 [[Microsoft]]
   ```

   **② 知识缺口**
   读取 `index.md` 和页面内容，找出被多次引用但没有独立页面的概念：
   ```
   🟡 知识缺口（2 个）：
     · GPT-4 — 被 5 个页面引用
     · Microsoft — 与 OpenAI 有投资关系但未收录
   ```

   **③ 建议方向**
   基于当前 wiki 的内容和关系网络，建议值得调查的课题：
   ```
   🟢 建议探索：
     · [[AI 安全]] — 多个实体涉及但缺乏系统梳理
   ```

6. 展示合并报告（机械 + 语义），询问是否修复。

### 第五步：执行修复

用户同意 → 执行修复流程
用户拒绝 → 结束，仅报告

**修复流程：**
7. 使用 Write 工具更新相关页面
8. 调用 `index-build` → 重建索引
9. 调用 `lint-all` → 验证修复结果
10. **追加 log.md**：
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

## 自动修复策略

### 缺失链接修复

| 情况 | 策略 |
|-----|------|
| 单页面引用 | 移除无效链接 |
| 多页面引用 | 建议用户创建实体 |

### 孤立页面修复

| 情况 | 策略 |
|-----|------|
| 有明确相关实体 | 在相关实体页面添加引用 |
| 无明确相关实体 | 标记 needs_review: true |

### 空页面修复

| 情况 | 策略 |
|-----|------|
| 有对应 raw 文件 | 建议重新 ingest |
| 无 raw 文件 | 标记 needs_review: true |

### 缺失 WikiLinks 修复

| 情况 | 策略 |
|-----|------|
| 单处提及 | 直接在正文中补上 `[[名称]]` |
| 多处提及 | 批量替换，一次写入 |
| 别名匹配 | 替换为 `[[规范名]]` |

## 报告格式

```markdown
## Wiki 健康检查结果

### 🔴 结构问题（X 个）
- [[Entity A]] 被 3 个页面引用但不存在
  → 建议：创建实体 或 移除引用

### 🟡 结构问题（X 个）
- [[Orphan B]] 无入链
  → 建议：在 [[Related C]] 添加引用

### 🟢 结构问题（X 个）
- [[Empty D]] 内容少于 50 字符
  → 建议：补充内容

**结构问题总计：X 个**

---

### 🔵 语义问题（深度检查）

#### 缺失 WikiLinks
- [[ChatGPT]] — "GPT-4" 应链接到 [[GPT-4]]

#### 知识缺口
- GPT-4 — 被 5 个页面引用但没有页面

#### 建议方向
- [[AI 安全]] — 多个实体涉及但缺乏系统梳理
```

## 修复后验证

修复完成后重新运行 lint-all，确认：
- missing 数量减少
- orphans 数量减少（或标记为 needs_review）
- 显示修复成功率
