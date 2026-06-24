# Ingest 工作流

> 从 raw 文档提取实体，写入 wiki。命令：`/ontomark-ingest`

## 触发条件

- 用户输入：`/ontomark` + 含有"处理/添加/导入"等关键词
- 或显式调用：`/ontomark-ingest`
- 或 `/ontomark ingest [文件路径]`

## 工作流程

### 第一步：获取上下文

```
1. 调用 ontology-status → 获取可用实体类型
   如果 ontology.yaml 不存在：
      - 扫描 raw/ 目录内容
      - 询问用户知识库的适用场景
      - 基于 ontology.yaml 样例给出本体设计建议
      - 用户确认后写入 ontology.yaml
2. 调用 pending-files → 获取待处理文件列表
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
6. 对提取的 content 进行 WikiLinks 标注：
   - 将实体名称替换为 [[canonical]]
   - 别名映射到规范名称
```

### 第五步：写入 wiki

```
7. 调用 wiki-write → 批量写入所有实体
   - 使用 --file 或 --entities 参数
   - isUpdate: false（新建）或 true（更新）
   - sources 使用字符串格式：["raw/file.md"]
8. 检查返回结果中的 failed 项
   - 成功：action = 'created' 或 'updated'
   - 失败：error 包含友好提示
9. 调用 mark-processed → 标记文件已处理
10. 调用 index-build → 重建索引
```

## 错误处理

- **类型不存在**：CLI 返回错误包含可用类型列表
- **实体已存在**：CLI 返回错误提示使用 `isUpdate: true`
- **实体不存在却要更新**：CLI 返回错误提示使用 `isUpdate: false`
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