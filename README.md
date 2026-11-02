# AGenUI 智能交互回复 Skill

依据 [PRD](AGenUI_Skill_PRD/01_PRD.md) 实现可独立使用的 Skill、版本化组件/能力清单、DSL 校验器与语义区域分批器。以 GPT Intelligent UI 的体验为目标，根据用户意图和已获取的信息，主动组合丰富且适用的组件与交互来组织答案。回复语言遵循用户与对话上下文。对接已有 AGenUI 端侧；本项目不包含浏览器验证台或 Harmony 客户端。

入口：[SKILL.md](skills/agenui-reply/SKILL.md)。整个 `skills/agenui-reply/` 可复制到 Skill 安装目录；首次在该目录安装依赖后可离线校验。

```sh
cd skills/agenui-reply
npm ci
npm test
npm run validate:examples
node scripts/cli.mjs validate examples/hotpot.json
node scripts/cli.mjs validate examples/hotpot.ndjson --surface new
node scripts/cli.mjs stream examples/route.json --regions examples/route.regions.json --out route.ndjson
```

需要 Node.js 22+。`validate` 支持 JSON 单消息、数组及 NDJSON，返回中文诊断；退出码 0 合法、1 内容不合法、2 工具/配置错误。默认 existing Surface，`--surface new` 要求创建消息。工具不会执行函数或发送消息。

- [组件索引](skills/agenui-reply/components/index.md)：22 个默认组件，3 个可选扩展。
- [能力清单](skills/agenui-reply/capabilities/index.md)：14 个官方值函数、自定义 calculateNumber / sendMsgToXiaoyi；openUrl、resolveCalls 默认关闭。
- [路线样例](skills/agenui-reply/examples/route.json) 与 [火锅样例](skills/agenui-reply/examples/hotpot.json)：完整版本及同目录 `.ndjson` 流式版本、`.regions.json` 区域划分。
- [设计与验收](docs/design/README.md)：需求映射、架构、协议差异、接入与演进。
- [官方快照及许可](skills/agenui-reply/vendor/SOURCE.json)：固定 A2UI v0.9 提交，Apache-2.0。

原始样例保留在 `AGenUI_Skill_PRD/sources/`，适配仅补齐数据初值；组件、函数名称、外观与交互声明沿用原样例。自定义函数以原始样例的 `calculateNumber` 和 `sendMsgToXiaoyi` 为准。火锅日期是生成时的示例默认值，重新生成时传入真实用户时区：

```sh
node scripts/build-examples.mjs --timezone America/New_York
```

自动验收覆盖协议和流式重放；真实联动、点击读取最新值、消息回传与状态保护仍须按 [宿主契约](skills/agenui-reply/references/host.md) 在已有端侧验证。
