[IMPORTANT!]
1. 这是一个新项目。不要为了老逻辑写出兼容代码。写出正确的逻辑。
2. 及时清理掉不需要的代码，保持整洁。

---

# OntoMark Skill 开发项目

这个项目是为了开发 OntoMark Skill。CLI 命令行是用来给 Skill 使用的。

## 项目结构

```
.
├── .claude/skills/ontomark/    # Skill 开发目录（项目内）
│   ├── SKILL.md                # 入口文件
│   ├── ingest.md               # Ingest 工作流
│   ├── query.md                # Query 工作流
│   ├── lint.md                 # Lint 工作流
│   └── reference/              # 参考文档
│
├── src/v3/                     # CLI 工具源码
│   ├── cli.ts                  # CLI 入口
│   └── tools/                  # CLI 工具实现
│
├── dist/v3/                    # 编译后的 CLI
│
├── scripts/
│   ├── install-skill.sh        # 安装 Skill 到 Claude Code 测试
│   └── uninstall-skill.sh      # 卸载测试 Skill
│
└── ontomark                    # CLI 快捷脚本
```

## 开发流程

### 1. 开发 Skill

编辑 `.claude/skills/ontomark/` 下的 Markdown 文件。

### 2. 开发 CLI

编辑 `src/v3/` 下的 TypeScript 文件。

编译：
```bash
npx tsc src/v3/cli.ts src/v3/index.ts src/v3/tools/*.ts \
  --outDir dist/v3 \
  --esModuleInterop \
  --moduleResolution node \
  --module commonjs \
  --skipLibCheck \
  --declaration \
  --target es2020
```

### 3. 测试 Skill

安装到 Claude Code：
```bash
./scripts/install-skill.sh
```

重启 Claude Code 或运行 `/reload-plugins`，然后测试：
```
/ontomark 处理文档
```

### 4. 卸载测试 Skill

```bash
./scripts/uninstall-skill.sh
```

## CLI 使用

```bash
# 快捷脚本
./ontomark --help

# 全局安装（可选）
sudo npm link
ontomark --help
```
