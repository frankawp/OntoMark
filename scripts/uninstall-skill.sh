#!/bin/bash
# 从 Claude Code 卸载 OntoMark Skill + Plugin

set -e

CLAUDE_SKILL_DIR="$HOME/.claude/skills/ontomark"
CLAUDE_PLUGIN_DIR="$HOME/.claude/plugins/ontomark"

echo "🗑️  卸载 OntoMark..."

if [ -d "$CLAUDE_SKILL_DIR" ]; then
    rm -rf "$CLAUDE_SKILL_DIR"
    echo "✅ Skill 已卸载: $CLAUDE_SKILL_DIR"
else
    echo "⚠️  Skill 未安装"
fi

if [ -d "$CLAUDE_PLUGIN_DIR" ]; then
    rm -rf "$CLAUDE_PLUGIN_DIR"
    echo "✅ Plugin 已卸载: $CLAUDE_PLUGIN_DIR"
else
    echo "⚠️  Plugin 未安装"
fi
