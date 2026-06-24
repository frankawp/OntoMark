#!/bin/bash
# 安装 OntoMark Skill + Plugin 到 Claude Code 进行测试
# 支持 rsync（快速、增量同步）和 cp（备选）

set -e

PROJECT_SKILL_DIR=".claude/skills/ontomark"
CLAUDE_SKILL_DIR="$HOME/.claude/skills/ontomark"
PROJECT_PLUGIN_DIR=".claude/plugins/ontomark"
CLAUDE_PLUGIN_DIR="$HOME/.claude/plugins/ontomark"

echo "📦 安装 OntoMark 到 Claude Code..."

# ============ 安装 Skill ============
echo ""
echo "--- Skill ---"
mkdir -p "$CLAUDE_SKILL_DIR"

if command -v rsync &> /dev/null; then
  rsync -av --delete "$PROJECT_SKILL_DIR/" "$CLAUDE_SKILL_DIR/"
else
  echo "⚠️ 未检测到 rsync，使用 cp 进行同步..."
  cp -R "$PROJECT_SKILL_DIR/"* "$CLAUDE_SKILL_DIR/" 2>/dev/null || true
  for f in "$CLAUDE_SKILL_DIR"/*; do
    basename=$(basename "$f")
    if [ ! -e "$PROJECT_SKILL_DIR/$basename" ]; then
      rm -rf "$f"
    fi
  done
fi
echo "✅ Skill 已安装到: $CLAUDE_SKILL_DIR"

# ============ 安装 Plugin ============
echo ""
echo "--- Plugin ---"

if [ -d "$PROJECT_PLUGIN_DIR" ]; then
  mkdir -p "$CLAUDE_PLUGIN_DIR"

  if command -v rsync &> /dev/null; then
    rsync -av --delete "$PROJECT_PLUGIN_DIR/" "$CLAUDE_PLUGIN_DIR/"
  else
    cp -R "$PROJECT_PLUGIN_DIR/"* "$CLAUDE_PLUGIN_DIR/" 2>/dev/null || true
    for f in "$CLAUDE_PLUGIN_DIR"/*; do
      basename=$(basename "$f")
      if [ ! -e "$PROJECT_PLUGIN_DIR/$basename" ]; then
        rm -rf "$f"
      fi
    done
  fi
  echo "✅ Plugin 已安装到: $CLAUDE_PLUGIN_DIR"
else
  echo "⚠️ Plugin 目录不存在，跳过: $PROJECT_PLUGIN_DIR"
fi

# ============ 完成 ============
echo ""
echo "✅ 安装完成！
"
echo "可用命令："
echo "  /ontomark          — Skill 入口（自动识别意图）"
echo "  /ontomark-init     — 初始化项目"
echo "  /ontomark-ingest   — 提取实体"
echo "  /ontomark-query    — 查询知识库"
echo "  /ontomark-lint     — 健康检查"
echo ""
echo "测试方法："
echo "  1. 重启 Claude Code 或运行 /reload-plugins"
echo "  2. 输入 /ontomark 或任意子命令测试"
