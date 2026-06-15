#!/bin/bash
# 安装 OntoMark Skill 到 Claude Code 进行测试
# 支持 rsync（快速、增量同步）和 cp（备选）

set -e

PROJECT_SKILL_DIR=".claude/skills/ontomark"
CLAUDE_SKILL_DIR="$HOME/.claude/skills/ontomark"

echo "📦 安装 OntoMark Skill 到 Claude Code..."

# 创建目标目录
mkdir -p "$CLAUDE_SKILL_DIR"

# 优先使用 rsync（更快、自动删除多余文件），否则用 cp
if command -v rsync &> /dev/null; then
  rsync -av --delete "$PROJECT_SKILL_DIR/" "$CLAUDE_SKILL_DIR/"
else
  echo "⚠️ 未检测到 rsync，使用 cp 进行同步..."
  cp -R "$PROJECT_SKILL_DIR/"* "$CLAUDE_SKILL_DIR/" 2>/dev/null || true
  # 清理目标目录中源目录已不存在的文件
  for f in "$CLAUDE_SKILL_DIR"/*; do
    basename=$(basename "$f")
    if [ ! -e "$PROJECT_SKILL_DIR/$basename" ]; then
      rm -rf "$f"
    fi
  done
fi

echo "✅ Skill 已安装到: $CLAUDE_SKILL_DIR"
echo ""
echo "测试方法："
echo "  1. 重启 Claude Code 或运行 /reload-plugins"
echo "  2. 输入 /ontomark 测试技能"
