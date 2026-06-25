[IMPORTANT!]
1. 这是一个新项目。不要为了老逻辑写出兼容代码。写出正确的逻辑。
2. 及时清理掉不需要的代码，保持整洁。

---

# OntoMark Skill 开发项目

这个项目是为了开发 OntoMark Skill。CLI 命令行是用来给 Skill 使用的。 这是一个claude-plugin 的marketplace工程。

skill放在skills目录，skill的目标是将知识转化成知识承载物，我们认为最好的知识承载物类似wikipedia的组织形式。因此，这些技能实现从各类物料转换为带双链的wikipedia过程。


## 开发流程

skill放在skills 目录。
cli工具的开发代码放在src目录。
功能测试使用tests目录。
E2E测试使用raw，wiki目录，raw存放原始物料，wiki存wiki页面


## 开发思路

参考 docs/idea/LLM_WIKI.md


## 技能面对的工作环境
1. raw 可能包括 技术文档，源代码工程。 文件数量非常多。
2. 人类可以提供专业建议和交流。 因此conversations中也蕴含知识，需要考虑如何从人脑中ingest知识来协助你将知识组织起来。
3. 用途多样。 同样的客观事物，被不同角色的人总结符合他们的知识，并对知识有不同的使用要求。
