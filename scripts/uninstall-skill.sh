#!/bin/bash
# 卸载 OntoMark CLI 和 Skill

set -e

echo "🗑️  卸载 OntoMark..."

# 卸载 Skill
if command -v ontomark &> /dev/null; then
    echo "⏳ 正在卸载 Skill..."
    ontomark skill-uninstall
fi

# 卸载 CLI
echo "⏳ 正在卸载 CLI..."
npm uninstall -g ontomark

echo "✅ OntoMark 已完全卸载"