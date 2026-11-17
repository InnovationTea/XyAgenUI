# Skill 维护说明

本文件面向维护者，不是模型在线生成回复时的执行入口。线上生成规则见 [SKILL.md](SKILL.md)。

## 本地检查

要求 Node.js 22 或更高版本。在 Skill 目录执行：

```sh
npm ci
npm test
npm run validate:examples
```

`npm test` 运行协议解析、Schema、表达式和流状态回归。`npm run validate:examples` 检查当前 golden/snippets 样例、每个可见批次前缀、负例诊断和最终重放一致性。校验工具不会验证图片可达性、视觉效果或真机行为。

## CLI 调试

最终 NDJSON 可用 CLI 在内部检查，不把临时文件作为默认交付物：

```sh
node scripts/cli.mjs validate <流文件> --json
node scripts/cli.mjs validate <复用已有Surface的流文件> --surface existing
```

CLI 默认 `new`，先要求 `createSurface`，再接受数据和组件；`catalogId` 固定为 `https://a2ui.org/specification/v0_9/standard_catalog.json`，profile 也必须使用该值。仅宿主明确提供已有 Surface 时使用 `--surface existing`。新回复使用宿主指定的 `surfaceId`，未指定时使用 `reply`；样例中的其他 ID 表示宿主已经指定。

`stream` 仅是开发维护用的分批工具。它可把完整组件源树按区域转换成 NDJSON，但模型线上输出应直接组织逐条消息，不要求先落盘完整 JSON：

```sh
node scripts/cli.mjs stream <源消息> --regions <区域文件> --out <输出文件>
```

校验或分批失败时保留诊断，修复组件/函数契约或样例后重新运行；不要把“运行了工具”写进用户回复，除非确实执行并且用户询问。

## 资源分层

- `capabilities/`：组件、函数、profile 与样式能力契约。
- `components/`：组件短说明和有效 Schema。
- `references/`：协议、组件选择、函数选择、流式、视觉和宿主维护规则。
- `examples/golden/`：当前规则下完整且可检查的在线流。
- `examples/snippets/`：单一语法或交互机制的最小正例。
- `examples/negative/`：错误输入及预期诊断。
- `examples/legacy/`：历史参考，仅用于追溯，不作为当前输出风格的首选模板。

新增组件或函数时，先更新有效 Schema、短说明、能力清单和相应正/负例，再更新校验器；样例只展示已实现契约，不定义扩展签名。历史示例迁移时同步更新 `tests/` 和 `scripts/check-examples.mjs` 的样例路径，避免旧的完整 JSON 路径残留。

修改组件说明生成规则后运行 `node scripts/build-resources.mjs`，确保 `components/` 与生成器一致。固定 vendor catalog 保留原文；Text 非正 `line-clamp` 的拒绝规则由本项目校验器补充，不能据快照中的不限行说明生成 0。
