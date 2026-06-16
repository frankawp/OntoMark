# WikiLinks 标注规则

> 在实体 context 中标注 WikiLinks，建立实体间关联。

[获取wiki中实体的方法](./query-entities.md)

你的目标是在content中将wiki实体标注出来。标注的实体可能已经存在于wiki中，也可能目前不存在，但是只要满足ontology.yaml定义的类型都需要你标注出来。

因此，可以标注未定义实体，即在content中出现的应该标注的目标实体，但目前在wiki中没有其对应页面的实体。


## 标注基本规则

### 1. 标注格式

```
[[规范名称]]
```

- 使用实体的名称（name）
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

结果："[[Connor Bedard|Bedard]] 在比赛中的表现"
```

## 标注流程

```
1. 获取 index-query 结果 → 已知实体列表
2. 遍历 context 文本
3. 对每个实体名称：
   a. 精确匹配 → 直接替换为 [[name]]
   b. 别名匹配 → 替换为 [[name]]
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
[[Connor Bedard|Bedard]] 昨晚打进了两球。
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

5. **来源引用不标注**：文档来源路径仅在 frontmatter 的 `sources` 字段记录，不作为 WikiLinks 标注
   - 正确：`sources: ["raw/cre-knowledge/aggregates/A01-借款工单管理.md"]`
   - 错误：`来源：[[raw/cre-knowledge/aggregates/A01-借款工单管理.md]]`

   来源是文档级的追溯信息，不是知识库实体，不应建立链接关系