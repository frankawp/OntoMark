#!/bin/bash
# 从 Claude Code 卸载 OntoMark Skill

set -e

CLAUDE_SKILL_DIR="$HOME/.claude/skills/ontomark"

echo "🗑️  卸载 OntoMark Skill..."

if [ -d "$CLAUDE_SKILL_DIR" ]; then
    rm -rf "$CLAUDE_SKILL_DIR"
    echo "✅ Skill 已卸载"
else
    echo "⚠️  Skill 未安装"
fi
