#!/bin/bash
# 安装 OntoMark Skill 到 Claude Code 进行测试
# 支持 rsync（快速、增量同步）和 cp（备选）

set -e

PROJECT_SKILLS_DIR="skills"
CLAUDE_SKILLS_DIR="$HOME/.claude/skills"

echo "📦 安装 OntoMark Skills 到 Claude Code..."

# 安装所有技能目录
for skill_dir in "$PROJECT_SKILLS_DIR"/*; do
  skill_name=$(basename "$skill_dir")
  echo "  → 安装 $skill_name"

  mkdir -p "$CLAUDE_SKILLS_DIR/$skill_name"

  if command -v rsync &> /dev/null; then
    rsync -av --delete "$skill_dir/" "$CLAUDE_SKILLS_DIR/$skill_name/"
  else
    cp -R "$skill_dir/"* "$CLAUDE_SKILLS_DIR/$skill_name/" 2>/dev/null || true
  fi
done

echo ""
echo "✅ Skills 已安装到: $CLAUDE_SKILLS_DIR"
echo ""
echo "测试方法："
echo "  1. 重启 Claude Code 或运行 /reload-plugins"
echo "  2. 输入 /ontomark 测试技能"
