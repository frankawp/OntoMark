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
