# 设计与验收

本项目交付智能交互回复 Skill 与离线协议工具，接入已有端侧。项目以 GPT Intelligent UI 的体验为目标；Skill 通过组件选择、信息组织、状态绑定和交互声明等具体规则落实这一目标，不写入目标口号，不限定回复语言。运行时不联网查询协议，不建设浏览器验证台或 Harmony 客户端。

| 文档 | 内容 |
|---|---|
| [需求映射](requirements.md) | G1–G5、两条 P0 主线与文件/验收对应 |
| [架构](architecture.md) | 目录分层、工具边界、诊断、依赖与状态模型 |
| [协议差异](protocol-differences.md) | 固定版本、官方 schema 修复、样例兼容及类型差异 |
| [接入契约](integration.md) | 已有宿主责任、投递流程与真实端侧验收 |
| [演进方式](evolution.md) | 组件/能力扩展、协议升级与回归 |
| [验收记录](acceptance.md) | 自动检查、独立试用和未替代的端侧检查 |

可独立复制的运行资源全部位于 [skills/agenui-reply](../../skills/agenui-reply/SKILL.md)。原始 PRD 与样例保留在 [AGenUI_Skill_PRD](../../AGenUI_Skill_PRD/01_PRD.md)。
