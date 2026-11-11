# AGenUI 智能交互回复 Skill

依据 [PRD](AGenUI_Skill_PRD/01_PRD.md) 实现可独立使用的 Skill、版本化组件/能力清单、DSL 校验器与语义区域分批器。简单回答使用普通文本；丰富或复杂且适合组件化的回答直接在回复正文输出 A2UI DSL，不默认生成 JSON/NDJSON 文件。对接已有 AGenUI 端侧；本项目不包含浏览器验证台或 Harmony 客户端。

入口：[SKILL.md](skills/agenui-reply/SKILL.md)。整个 `skills/agenui-reply/` 可复制到 Skill 安装目录；首次在该目录安装依赖后可离线校验。

```sh
cd skills/agenui-reply
npm ci
npm test
npm run validate:examples
node scripts/cli.mjs validate examples/golden/concert-append.ndjson
node scripts/cli.mjs validate examples/golden/interactive-append.ndjson --json
```

需要 Node.js 22+。离线 `validate` 支持 JSON 单消息、数组及 NDJSON，返回中文诊断；退出码 0 合法、1 内容不合法、2 工具/配置错误。CLI 默认 `new`，要求先发送 `createSurface`；只有宿主明确复用已有 Surface 时才用 `--surface existing`。新回复使用宿主指定的 `surfaceId`，未指定时使用 `reply`，`catalogId` 固定为 `https://a2ui.org/specification/v0_9/standard_catalog.json`。工具不会执行函数或发送消息。

- [组件索引](skills/agenui-reply/components/index.md)：22 个默认组件，3 个可选扩展。
- [组件场景选择](skills/agenui-reply/references/component-selection.md)：先判断是否需要 UI，再按信息结构和宿主 profile 选择或降级组件；需要背景图时按视觉规则主动搜索主题相关图片。
- [能力清单](skills/agenui-reply/capabilities/index.md)：14 个官方值函数、自定义 calculateNumber / sendMsgToXiaoyi；openUrl、resolveCalls 默认关闭。
- [演唱会 golden 流](skills/agenui-reply/examples/golden/concert-append.ndjson)：建面、字符串数组初值、三行摘要和逐区域追加的完整 root；[示例索引](skills/agenui-reply/examples/README.md) 区分当前正例与历史参考。
- [维护说明](skills/agenui-reply/MAINTAINING.md)：离线分批、契约生成与检查命令。
- [设计与验收](docs/design/README.md)：需求映射、架构、协议差异、接入与演进。
- [官方快照及许可](skills/agenui-reply/vendor/SOURCE.json)：固定 A2UI v0.9 提交，Apache-2.0。

原始路线、火锅样例保留在 `AGenUI_Skill_PRD/sources/`，迁移产物位于 `examples/legacy/`，仅用于历史参考。自定义函数以当前有效契约为准。火锅日期是生成时的示例默认值，重新生成历史样例时传入真实用户时区：

```sh
node scripts/build-examples.mjs --timezone America/New_York
```

自动验收覆盖协议和流式重放；真实联动、点击读取最新值、消息回传与状态保护仍须按 [宿主契约](skills/agenui-reply/references/host.md) 在已有端侧验证。
