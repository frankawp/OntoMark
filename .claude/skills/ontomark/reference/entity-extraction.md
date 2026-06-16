# 实体提取 Prompt 模板

> 多层实体提取策略，从文档中识别直接、推断和总结实体。

## 重要前提

**必须先调用 `ontomark ontology-status <project-path>` 获取当前项目可用的实体类型。**

技能目录下的 `ontology.yaml` 仅为格式样例，不代表用户项目的实际类型定义。切勿直接使用样例中的类型名称。

## Prompt 模板

```
你是一个知识提取专家。请从以下文档中提取实体。

## 实体类型定义
{此处插入 ontology-status 返回的 entityTypes}

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
    "name": "实体名称",
    "type": "实体类型（必须存在于 entityTypes）",
    "aliases": ["别名1", "别名2"],
    "content": "实体的完整描述，包含所有关键信息",
    "sources": ["raw/document.md"],
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

1. 所有 type 必须存在于 entityTypes 中
2. name 使用最完整、最规范的名称（同时也是文件名）
3. aliases 包含文档中出现的其他称呼
4. content 应包含完整的实体描述，所有关键信息都写在 content 中
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
    "canonical": "Connor Bedard",
    "type": "Person",
    "aliases": ["Bedard", "这位 18 岁的新秀"],
    "content": "Connor Bedard 是一名 18 岁的冰球运动员，担任球队的进攻核心。在昨晚的比赛中表现出色，帮助球队取得胜利。",
    "sources": ["raw/article.md"],
    "extraction_type": "direct"
  },
  {
    "canonical": "昨晚比赛",
    "type": "Event",
    "aliases": [],
    "content": "昨晚举行的冰球比赛，Connor Bedard 在此比赛中表现出色。",
    "sources": ["raw/article.md"],
    "extraction_type": "inferred"
  }
]
```
