# OntoMark V3 Skill 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建 Claude Code Skill，编排 V3 CLI 工具完成知识库工作流

**Architecture:** 纯 Markdown 技能文件，分层结构（入口 + 工作流 + 参考），无编译依赖

**Tech Stack:** Markdown, Claude Code Skill 系统

---

## 文件结构

```
.claude/skills/ontomark/
├── SKILL.md                    # 入口 + 意图识别
├── ingest.md                   # Ingest 工作流
├── query.md                    # Query 工作流
├── lint.md                     # Lint 工作流
└── reference/
    ├── entity-extraction.md    # 实体提取 Prompt 模板
    ├── wikilinks-annotation.md # WikiLinks 标注规则
    └── conflict-resolution.md  # 冲突处理策略
```

---

## Task 1: 创建 Skill 目录结构

**Files:**
- Create: `.claude/skills/ontomark/`
- Create: `.claude/skills/ontomark/reference/`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p .claude/skills/ontomark/reference
```

- [ ] **Step 2: 验证目录存在**

Run: `ls -la .claude/skills/ontomark/`
Expected: 显示 `reference` 目录

- [ ] **Step 3: 提交**

```bash
git add .claude/skills/
git commit -m "chore: 创建 OntoMark Skill 目录结构"
```

---

## Task 2: 创建 SKILL.md 入口文件

**Files:**
- Create: `.claude/skills/ontomark/SKILL.md`

- [ ] **Step 1: 创建 SKILL.md**

```markdown
# OntoMark Skill

> 将文档转化为持久化知识库。入口：`/ontomark`

## 意图识别

根据用户输入判断工作流：

| 关键词模式 | 工作流 | 子命令 |
|-----------|--------|--------|
| 处理/添加/导入/ingest | Ingest | `/ontomark ingest` |
| 谁/什么/查询/query | Query | `/ontomark query` |
| 检查/lint/健康/孤立 | Lint | `/ontomark lint` |

## 工作流

- **[Ingest](./ingest.md)** — 从 raw 文档提取实体，写入 wiki
- **[Query](./query.md)** — 查询 wiki 知识，生成回答
- **[Lint](./lint.md)** — 检查 wiki 健康状态，建议修复

## 强制规则

1. **先读后写** — 调用 `wiki-write` 前必须先读取或查询实体状态
2. **类型来源** — 所有实体类型从 `ontology-status` 获取，不硬编码
3. **来源追溯** — 每个实体必须记录 sources
4. **WikiLinks 由 LLM 标注** — CLI 不处理语义标注

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

- [ ] **Step 2: 验证文件**

Run: `cat .claude/skills/ontomark/SKILL.md | head -20`
Expected: 显示文件内容

- [ ] **Step 3: 提交**

```bash
git add .claude/skills/ontomark/SKILL.md
git commit -m "feat(skill): 添加 SKILL.md 入口文件"
```

---

## Task 3: 创建 ingest.md

**Files:**
- Create: `.claude/skills/ontomark/ingest.md`

- [ ] **Step 1: 创建 ingest.md**

```markdown
# Ingest 工作流

> 从 raw 文档提取实体，写入 wiki。

## 触发条件

- 用户输入：`/ontomark` + 含有"处理/添加/导入"等关键词
- 或显式调用：`/ontomark ingest [文件路径]`

## 工作流程

### 第一步：获取上下文

```
1. 调用 ontology-status → 获取可用实体类型
2. 调用 raw-status → 获取待处理文件列表
3. 选择一个待处理文件（用户指定或按顺序）
```

### 第二步：读取文档

```
4. Read → 读取 raw 文档内容
```

### 第三步：多层实体提取

参考 [entity-extraction.md](./reference/entity-extraction.md) 执行实体提取：

**第一层：直接识别**
- 扫描文档，识别明确提到的实体名称

**第二层：上下文推断**
- 分析段落上下文，推断隐含实体
- 例："比赛在主场举行" → 推断主场城市

**第三层：全局总结**
- 总结文档主题，提取概念性实体
- 例：整篇讨论 NHL 新秀 → 提取 NHL、赛季等概念

### 第四步：处理 WikiLinks

参考 [wikilinks-annotation.md](./reference/wikilinks-annotation.md) 标注实体引用：

```
5. 调用 index-query → 检查每个实体是否已存在
6. 对提取的 context 进行 WikiLinks 标注：
   - 将实体名称替换为 [[canonical]]
   - 别名映射到规范名称
```

### 第五步：写入 wiki

```
7. 调用 wiki-write → 批量写入所有实体
   - isUpdate: false（新建）
   - 传入已标注的 content
8. 调用 mark-processed → 标记文件已处理
9. 调用 index-build → 重建索引
```

## 错误处理

- **类型不存在**：提示用户更新 ontology 或选择最接近类型
- **实体已存在**：询问用户是否更新（参考 [conflict-resolution.md](./reference/conflict-resolution.md)）
- **文件已处理**：跳过或询问是否强制重处理

## 输出报告

```markdown
## Ingest 完成

- 文件：raw/article.md
- 提取实体：X 个
  - 直接识别：X 个
  - 上下文推断：X 个
  - 全局总结：X 个
- 新建页面：X 个
- 更新页面：X 个
```
```

- [ ] **Step 2: 提交**

```bash
git add .claude/skills/ontomark/ingest.md
git commit -m "feat(skill): 添加 Ingest 工作流文档"
```

---

## Task 4: 创建 query.md

**Files:**
- Create: `.claude/skills/ontomark/query.md`

- [ ] **Step 1: 创建 query.md**

```markdown
# Query 工作流

> 查询 wiki 知识，生成回答，用户确认后可选存储。

## 触发条件

- 用户输入：`/ontomark` + 含有"谁/什么/查询/列出"等关键词
- 或显式调用：`/ontomark query [问题]`

## 工作流程

### 第一步：解析问题

```
1. 分析用户问题，识别涉及的实体/概念
```

### 第二步：查询实体

```
2. 调用 index-query → 查询每个实体是否存在
3. Read → 读取相关实体页面
```

### 第三步：生成回答

```
4. 综合多个实体信息，生成回答
5. 根据问题类型选择输出格式
```

### 第四步：展示与存储

```
6. 向用户展示回答
7. 询问："这个回答有价值，要存入 wiki 作为 Topic 页面吗？"
   
   用户同意 → 调用 wiki-write → 创建 Topic 页面
   用户拒绝 → 结束，不存储
```

## 回答形式

| 问题类型 | 输出格式 | 示例 |
|---------|---------|------|
| 简单查询 | 直接文本 + 来源 | "John Doe 是一名工程师，来自 [[Article]]" |
| 对比分析 | Markdown 表格 | `\| 属性 \| A \| B \|` |
| 关系梳理 | Mermaid 图表 | `graph LR; A --> B` |
| 事件梳理 | 时间线列表 | `- 2026-01: 事件A` |

## Topic 页面命名规则

- 使用用户问题的核心概念作为 canonical
- 自动关联涉及的实体（WikiLinks）
- 标记 `needs_review: false`（用户已确认）
- sources 包含所有引用的实体

## 来源追溯

回答中每个关键信息必须标注来源：
- 单来源：`[[实体名]] (来源段落)`
- 多来源：`[[实体A]], [[实体B]]`

## 示例

**用户问题：** "John Doe 和 Jane Doe 有什么关系？"

**回答：**
```markdown
John Doe 和 Jane Doe 是同事关系。

| 属性 | John Doe | Jane Doe |
|------|----------|----------|
| 角色 | 工程师 | 设计师 |
| 部门 | 技术部 | 产品部 |

来源：[[John Doe]], [[Jane Doe]]
```
```

- [ ] **Step 2: 提交**

```bash
git add .claude/skills/ontomark/query.md
git commit -m "feat(skill): 添加 Query 工作流文档"
```

---

## Task 5: 创建 lint.md

**Files:**
- Create: `.claude/skills/ontomark/lint.md`

- [ ] **Step 1: 创建 lint.md**

```markdown
# Lint 工作流

> 检查 wiki 健康状态，发现问题并建议修复。

## 触发条件

- 用户输入：`/ontomark` + 含有"检查/lint/健康/孤立"等关键词
- 或显式调用：`/ontomark lint`

## 工作流程

### 第一步：获取问题列表

```
1. 调用 lint-all → 获取所有问题
   - orphans: 孤立页面（无入链）
   - missing: 缺失链接（引用不存在实体）
   - empty: 空内容页面
```

### 第二步：分析严重程度

```
2. 按严重程度分类：

🔴 高优先级：
   - 缺失链接被多个页面引用（影响范围 > 1）
   - 核心实体页面为空（canonical/status 类实体）
   
🟡 中优先级：
   - 孤立页面（有价值但未被引用）
   - 空页面（内容少于 50 字符）
   
🟢 低优先级：
   - 少量孤立页面（< 3 个）
   - 单一缺失链接
```

### 第三步：展示报告

```
3. 按优先级展示问题列表
4. 询问："发现 X 个问题，建议修复：[问题摘要]。是否自动修复？"
```

### 第四步：执行修复

```
用户同意 → 执行修复流程
用户拒绝 → 结束，仅报告

修复流程：
5. 调用 wiki-write → 更新相关页面
6. 调用 index-build → 重建索引
7. 调用 lint-all → 验证修复结果
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

## 报告格式

```markdown
## Wiki 健康检查结果

### 🔴 高优先级 (X 个)
- [[Entity A]] 被 3 个页面引用但不存在
  → 建议：创建实体 或 移除引用

### 🟡 中优先级 (X 个)
- [[Orphan B]] 无入链
  → 建议：在 [[Related C]] 添加引用

### 🟢 低优先级 (X 个)
- [[Empty D]] 内容少于 50 字符
  → 建议：补充内容

**总计：X 个问题**
```

## 修复后验证

修复完成后重新运行 lint-all，确认：
- missing 数量减少
- orphans 数量减少（或标记为 needs_review）
- 显示修复成功率
```

- [ ] **Step 2: 提交**

```bash
git add .claude/skills/ontomark/lint.md
git commit -m "feat(skill): 添加 Lint 工作流文档"
```

---

## Task 6: 创建 entity-extraction.md

**Files:**
- Create: `.claude/skills/ontomark/reference/entity-extraction.md`

- [ ] **Step 1: 创建 entity-extraction.md**

```markdown
# 实体提取 Prompt 模板

> 多层实体提取策略，从文档中识别直接、推断和总结实体。

## Prompt 模板

```
你是一个知识提取专家。请从以下文档中提取实体。

## 实体类型定义
{此处插入 ontology-status 返回的 entity_types}

## 提取策略

### 第一层：直接识别
扫描文档，识别明确提到的实体名称：
- 人名、地名、机构名
- 事件、日期、时间
- 明确定义的术语和概念

### 第二层：上下文推断
分析每个段落的上下文，推断隐含实体：
- 代词指代："他在比赛中的表现" → 关联前文提到的实体
- 隐含地点："主场观众" → 推断所在城市
- 时间线索："本赛季" → 关联具体赛季
- 隐含关系："他的队友" → 关联所属团队

### 第三层：全局总结
总结文档整体主题，提取概念性实体：
- 核心话题 → 概念实体
- 讨论范围 → 领域实体
- 事件背景 → 环境实体

## 输出格式

返回 JSON 数组，每个实体包含：

```json
[
  {
    "name": "实体规范名称",
    "type": "实体类型（必须存在于 entity_types）",
    "aliases": ["别名1", "别名2"],
    "info": {
      "字段1": "值1",
      "字段2": "值2"
    },
    "context": "实体描述或上下文片段",
    "extraction_type": "direct | inferred | summarized"
  }
]
```

## extraction_type 说明

| 值 | 含义 | 置信度 |
|----|------|--------|
| `direct` | 文档中明确提及 | 高 |
| `inferred` | 从上下文推断 | 中 |
| `summarized` | 从全局总结得出 | 低 |

## 注意事项

1. 所有 type 必须存在于 entity_types 中
2. name 使用最完整、最规范的名称
3. aliases 包含文档中出现的其他称呼
4. info 根据 entity_types 的 template 填充
5. context 保持原文本片段，便于溯源
```

## 使用示例

**输入文档：**
```
Connor Bedard 在昨晚的比赛中表现出色，帮助球队取得胜利。
这位 18 岁的新秀已经成为了球队的进攻核心。
```

**输出：**
```json
[
  {
    "name": "Connor Bedard",
    "type": "Person",
    "aliases": ["Bedard", "这位 18 岁的新秀"],
    "info": {
      "age": "18",
      "role": "进攻核心"
    },
    "context": "Connor Bedard 在昨晚的比赛中表现出色，帮助球队取得胜利。",
    "extraction_type": "direct"
  },
  {
    "name": "昨晚比赛",
    "type": "Event",
    "aliases": [],
    "info": {
      "date": "昨晚"
    },
    "context": "昨晚的比赛中表现出色",
    "extraction_type": "inferred"
  }
]
```
```

- [ ] **Step 2: 提交**

```bash
git add .claude/skills/ontomark/reference/entity-extraction.md
git commit -m "feat(skill): 添加实体提取 Prompt 模板"
```

---

## Task 7: 创建 wikilinks-annotation.md

**Files:**
- Create: `.claude/skills/ontomark/reference/wikilinks-annotation.md`

- [ ] **Step 1: 创建 wikilinks-annotation.md**

```markdown
# WikiLinks 标注规则

> 在实体 context 中标注 WikiLinks，建立实体间关联。

## 基本规则

### 1. 标注格式

```
[[规范名称]]
```

- 使用实体的规范名称（canonical）
- 不使用别名作为链接目标

### 2. 标注位置

在 context 字段中标注：
- 提及的实体名称
- 推断关联的实体

### 3. 别名处理

```
原文："Bedard 在比赛中的表现"

处理：
1. 检查 "Bedard" 是否为已知别名
2. 如果是，映射到规范名称
3. 替换为规范名称的链接

结果："[[Connor Bedard]] 在比赛中的表现"
```

## 标注流程

```
1. 获取 index-query 结果 → 已知实体列表
2. 遍历 context 文本
3. 对每个实体名称：
   a. 精确匹配 → 直接替换为 [[canonical]]
   b. 别名匹配 → 替换为 [[canonical]]
   c. 模糊匹配 → 询问用户确认
4. 输出标注后的 context
```

## 示例

### 示例 1：精确匹配

**输入：**
```
Connor Bedard 在比赛中的表现令人印象深刻。
```

**已知实体：** `Connor Bedard`

**输出：**
```
[[Connor Bedard]] 在比赛中的表现令人印象深刻。
```

### 示例 2：别名匹配

**输入：**
```
Bedard 昨晚打进了两球。
```

**已知实体：** `Connor Bedard`（别名：Bedard）

**输出：**
```
[[Connor Bedard]] 昨晚打进了两球。
```

### 示例 3：多实体

**输入：**
```
Connor Bedard 和 Sidney Crosby 在训练中交流。
```

**已知实体：** `Connor Bedard`, `Sidney Crosby`

**输出：**
```
[[Connor Bedard]] 和 [[Sidney Crosby]] 在训练中交流。
```

## 注意事项

1. **不重复标注**：已标注的实体不再嵌套标注
   - 正确：`[[Connor Bedard]]`
   - 错误：`[[Connor [[Bedard]]]]`

2. **保持原文本**：只替换名称为链接，不改变其他内容

3. **区分大小写**：实体名称区分大小写

4. **中英文空格**：
   - 英文实体：直接替换
   - 中文实体：保留原空格
```

- [ ] **Step 2: 提交**

```bash
git add .claude/skills/ontomark/reference/wikilinks-annotation.md
git commit -m "feat(skill): 添加 WikiLinks 标注规则"
```

---

## Task 8: 创建 conflict-resolution.md

**Files:**
- Create: `.claude/skills/ontomark/reference/conflict-resolution.md`

- [ ] **Step 1: 创建 conflict-resolution.md**

```markdown
# 冲突处理策略

> 处理实体提取和写入过程中的冲突情况。

## 冲突类型

### 1. 实体已存在

**场景：** 提取的实体在 wiki 中已存在

**判断：** `index-query(name).found === true`

**处理策略：**

| 情况 | 策略 |
|-----|------|
| 信息完全一致 | 跳过，不重复写入 |
| 新增别名 | 合并 aliases，更新实体 |
| 信息冲突 | 询问用户如何处理 |

**询问模板：**
```
实体 "John Doe" 已存在：
- 现有别名：Johnny
- 新增别名：JD

是否合并？
A. 合并（保留现有 + 添加新别名）
B. 跳过（不更新）
C. 查看详情后决定
```

### 2. 类型不匹配

**场景：** 同名实体但类型不同

**判断：** `index-query(name).type !== extracted.type`

**处理策略：**

| 情况 | 策略 |
|-----|------|
| 新类型更具体 | 建议拆分为两个实体 |
| 新类型更泛化 | 保留原类型 |
| 无法判断 | 询问用户 |

**询问模板：**
```
发现类型冲突：
- 现有："John Doe" (Person)
- 提取："John Doe" (Event)

可能的处理：
A. 创建消歧页面（John Doe (Person), John Doe (Event)）
B. 覆盖现有类型
C. 跳过此实体
```

### 3. 信息冲突

**场景：** 同一实体的 info 字段值不同

**判断：** `existing.info[key] !== new.info[key]`

**处理策略：**

| 情况 | 策略 |
|-----|------|
| 新信息补充旧信息 | 合并（保留所有非空值） |
| 新信息替代旧信息 | 更新为新值 |
| 无法判断 | 询问用户 |

**询问模板：**
```
实体 "John Doe" 信息冲突：
- 现有 role: "工程师"
- 新增 role: "技术总监"

是否更新？
A. 更新为新值
B. 保留原值
C. 合并为多值
```

### 4. 来源追溯冲突

**场景：** 同一实体有多个来源但信息不一致

**处理策略：**

1. 标记 `needs_review: true`
2. 在 content 中注明冲突：
   ```markdown
   ## 信息冲突

   来源 A：角色为工程师
   来源 B：角色为技术总监
   
   请人工确认。
   ```
3. 等待用户审核

## 自动处理优先级

```
1. 信息完全一致 → 跳过
2. 新增别名 → 自动合并
3. 补充 info → 自动合并
4. 类型不匹配 → 询问
5. 信息冲突 → 询问
```

## 用户确认后操作

用户确认后调用 `wiki-write`：
- `isUpdate: true`
- 合并后的 aliases
- 合并后的 info
- 追加新的 content 和 sources
```

- [ ] **Step 2: 提交**

```bash
git add .claude/skills/ontomark/reference/conflict-resolution.md
git commit -m "feat(skill): 添加冲突处理策略"
```

---

## Task 9: 更新 CLAUDE.md 添加 Skill 引用

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 更新 CLAUDE.md**

在 `CLAUDE.md` 中添加：

```markdown
# OntoMark Skill

- **ontomark** (`~/.claude/skills/ontomark/SKILL.md`) - 知识库管理工作流。触发：`/ontomark`
```

- [ ] **Step 2: 验证更新**

Run: `cat CLAUDE.md`
Expected: 包含 OntoMark Skill 引用

- [ ] **Step 3: 提交**

```bashAUDE.md
git commit -m "docs: 在 CLAUDE.md 添加 OntoMark Skill 引用"
```

---

## Task 10: 最终验证

**Files:**
- 无新建文件

- [ ] **Step 1: 验证目录结构**

Run: `find .claude/skills/ontomark -type f -name "*.md" | sort`
Expected:
```
.claude/skills/ontomark/SKILL.md
.claude/skills/ontomark/ingest.md
.claude/skills/ontomark/lint.md
.claude/skills/ontomark/query.md
.claude/skills/ontomark/reference/conflict-resolution.md
.claude/skills/ontomark/reference/entity-extraction.md
.claude/skills/ontomark/reference/wikilinks-annotation.md
```

- [ ] **Step 2: 验证文件数量**

Run: `find .claude/skills/ontomark -type f -name "*.md" | wc -l`
Expected: `7`

- [ ] **Step 3: 提交所有更改（如有遗漏）**

```bash
git status
git add -A
git commit -m "feat(skill): 完成 OntoMark V3 Skill 实现" || echo "No changes to commit"
```

---

## Self-Review

### 1. Spec Coverage

| 规格要求 | 任务 |
|---------|------|
| SKILL.md 入口 | Task 2 ✅ |
| ingest.md | Task 3 ✅ |
| query.md | Task 4 ✅ |
| lint.md | Task 5 ✅ |
| entity-extraction.md | Task 6 ✅ |
| wikilinks-annotation.md | Task 7 ✅ |
| conflict-resolution.md | Task 8 ✅ |
| CLAUDE.md 引用 | Task 9 ✅ |

### 2. Placeholder Scan

- ✅ 无 TBD、TODO
- ✅ 所有文件内容完整
- ✅ 所有 Markdown 格式正确

### 3. Type Consistency

- ✅ 工作流文件命名一致
- ✅ reference 文件命名一致
- ✅ 链接引用格式一致

---

**计划完成。准备执行实现。**
