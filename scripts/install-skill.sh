#!/bin/bash
# 安装 OntoMark CLI 和 Skill 到 Claude Code

set -e

echo "📦 安装 OntoMark..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js (>= 18)"
    exit 1
fi

# 检查是否已安装 CLI
if ! command -v ontomark &> /dev/null; then
    echo "⏳ 正在全局安装 ontomark CLI..."
    npm install -g ontomark
else
    echo "✅ ontomark CLI 已安装"
fi

# 安装 Skill
echo "⏳ 正在安装 Skill 到 Claude Code..."
ontomark skill-install

echo ""
echo "🎉 安装完成！"
echo ""
echo "下一步："
echo "  1. 重启 Claude Code 或运行 /reload-plugins"
echo "  2. 运行 /ontomark 测试 Skill"