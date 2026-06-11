# OntoMark

Ontology-Aware Markdown Enhancer - 根据本体定义自动增强 Markdown 文档，生成 Obsidian 兼容的知识图谱。

## 特性

- 🏷️ 实体识别与链接
- 📊 本体 Schema 支持
- 🔄 增量处理机制
- 🔗 Obsidian 原生语法兼容
- 🤖 AI Agent 集成友好

## 安装

```bash
npm install ontomark
```

## 快速开始

### CLI 使用

```bash
# 索引 Vault
ontomark index ./notes

# 增强单个文件
ontomark enhance ./notes/Concepts/JWT.md

# 批量增强
ontomark enhance-all ./notes

# 查看状态
ontomark status ./notes
```

### SDK 使用

```typescript
import { OntoMark, LLMProvider } from 'ontomark';

// 实现 LLM Provider
const myLLMProvider: LLMProvider = {
  async recognize(input) {
    // 调用你的 LLM API
    return { entities: [...] };
  }
};

// 创建实例
const ontomark = new OntoMark({
  vaultPath: './notes',
  llmProvider: myLLMProvider,
});

// 构建索引
await ontomark.buildIndex();

// 增强文件
await ontomark.enhanceFile('./notes/JWT.md');

// 批量增强
await ontomark.enhanceAll();
```

## 本体 Schema

在 Vault 根目录创建 `ontology.yaml`：

```yaml
version: "1.0"
entity_types:
  Concept:
    description: 技术概念
  System:
    description: 系统
  Component:
    description: 组件
relations:
  uses:
    from: System
    to: Concept
```

## 工作原理

1. **索引阶段**: 扫描 Vault，构建实体索引
2. **增强阶段**: 识别实体、解析冲突、生成链接
3. **增量机制**: 通过 MD5 hash 避免重复处理

## 许可证

MIT
