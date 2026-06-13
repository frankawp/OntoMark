#!/bin/bash
# 安装 OntoMark Skill 到 Claude Code 进行测试

set -e

PROJECT_SKILL_DIR=".claude/skills/ontomark"
CLAUDE_SKILL_DIR="$HOME/.claude/skills/ontomark"

echo "📦 安装 OntoMark Skill 到 Claude Code..."

# 创建目标目录
mkdir -p "$CLAUDE_SKILL_DIR"

# 同步 Skill 文件
rsync -av --delete "$PROJECT_SKILL_DIR/" "$CLAUDE_SKILL_DIR/"

echo "✅ Skill 已安装到: $CLAUDE_SKILL_DIR"
echo ""
echo "测试方法："
echo "  1. 重启 Claude Code 或运行 /reload-plugins"
echo "  2. 输入 /ontomark 测试技能"
