# AGenUI 校验器 2.1.0

本目录可独立复制、测试和运行。HTTP 服务、CLI 和 Node 库共用同一个校验内核；运行时不读取模型 Skill，不创建界面、不发消息、不执行 DSL 中的函数，也不自动修复模型输出。

## 启动

Node.js 22+，依赖见 package-lock.json。源码版先执行 `npm ci`；离线版已经带有锁定依赖。发布包中预先包含默认契约，启动不依赖构建或相邻目录。

```sh
npm start
# 普通CLI：检查已完成的离线流
node scripts/cli.mjs validate fixtures/golden/portion-planner.ndjson --format ndjson --surface new --json
# 进程管道：逐块读取，标准输出只写已接受的消息
node scripts/online.mjs - < fixtures/golden/portion-planner.ndjson
```

HTTP 路由、响应状态、会话边界与并发限制见 [SERVICE.md](docs/SERVICE.md)。Python Agent 的调用顺序与从模型流转发方式见 [AGENT-INTEGRATION.md](docs/AGENT-INTEGRATION.md)。

## 校验边界

- 单次回复持有自己的 `ReplySession` 和 UTF-8/NDJSON 缓冲。候选消息验证成功后提交，首区可在 EOF 前透传；仅缓存半行。不得为每个 chunk 另建会话或把全部消息缓存在网关直到结束。
- 后续区域只能按当前单轮约定追加；模型不能覆写已展示的输入。刷新、重试、真实函数授权与端侧状态由宿主管理。HTTP 控制层元数据不能发送给 AGenUI 渲染器。
- 使用已固定的 A2UI v0.9 宿主别名与有效 Catalog，保留 22 种默认组件、vp/无单位尺寸、原序列化类型及现有函数边界。
- 这里验证结构和可判定的语义，不证明控件已显示、不执行真机布局与资源访问；设备字体与触控仍由端侧验收。

## 运行时与维护文件

| 路径 | 用途 |
|---|---|
| `scripts/lib/index.mjs` | Node 公共接口：loadCatalog、contractStamp、ReplySession、NDJSONReplyStream、parseMessages、validateMessages、streamMessages |
| `scripts/{service,cli,online}.mjs` | HTTP 服务、离线 CLI、逐行在线 CLI |
| `contract/`、`vendor/` | 运行时权威输入：实际能力配置、兼容层、自定义函数与锁定的上游 Schema；vendor 原始字节和许可证保留 |
| `generated/contract-stamp.json` | 默认协议配置的发布指纹；服务按实际运行配置重新计算，避免手动切换 profile 后误报兼容 |
| `authoring/` | 仅构建时使用的视觉源配方、Token、语法注释、示例输入 |
| `fixtures/`、`tests/`、`validation/` | 回归夹具、单元/HTTP测试、离线验证记录；服务不从这里加载业务数据 |
| `scripts/build-*.mjs`、`scripts/export-skill.mjs` | 构建本地契约/夹具，并按维护者的明确命令生成模型文档与快照 |

运行服务时无需 `authoring/`、`fixtures/`、`tests/`、`validation/` 和模型用法文档。两目录可以放在不同机器上。依赖与运行时文件须保持相同版本。

生成最小运行目录：`node scripts/stage-runtime.mjs /新建的空目录/validator [--with-deps]`。添加 `--with-deps` 时带上本地锁定依赖；该目录用于运行服务，不承载源码工程的构建或回归命令。

## 构建、回归与发布

```sh
# 本目录即可完成；不需要存在模型Skill：
npm run build
npm test
npm run validate:examples
npm run validate:visuals
npm run audit

# 仅发布时执行。目标是已有、具有手写SKILL.md的模型资料目录：
npm run export:skill
npm run check:skill
npm run verify:skill
# 非默认位置用 --out：
npm run check:skill -- --out /your/path/agenui-reply-skill
```

权威源是本目录的 contract、vendor、authoring 和构建脚本。请先修改权威源，再导出；模型提示、使用策略和手写指南在 Skill 目录维护。普通 build/test 不会读写 Skill。export:skill 只更新受管文件，check:skill 重新构建预期内容并逐字节比对，不修改目标。新增文件会被导出；不再生成的旧文件会显式报告，维护者应先审查再移除。不要手工复制一份 Schema 后在两端分别维护。

`contractSha256` 根据两项计算：完整的有效 Schema、实际生效的能力配置；JSON 对象键排序，数组顺序保留。它用于发现组件/函数可用范围或字段定义漂移；非 Schema 的单轮策略与 HTTP 接口还应同时固定校验器发布版本。由 Agent 从 Skill 的 `generated/contract-stamp.json` 读取并对接校验器，不能让模型生成指纹或塞入 A2UI。模板、函数文档与少量示例的漂移由 check:skill 重新生成并逐字节比较；外观或提示变化不一定改变协议指纹。

## 模型资料 v2.3.0

模型入口负责在第一条公开输出前判断 NO_UI 或 UI_PRIMARY，普通文字不进入本服务。模型包中，25 种组件按六册编排；索引直达每个组件的场景、边界、参数和完整模板。两类函数、协议、视觉和回放示例仍各有明确位置。

服务运行版本仍为 2.1.0。完整 Schema 位于本目录 generated/effective-catalog.json；服务无需为这次文档重组重新部署。更新模型 Skill 请整目录替换，不要叠加在 v2.2 的组件单页上。维护时先改权威源、再导出；导出仅写受管资料，入口、协议和视觉规则仍手写。

## 版本与迁移

2.1.0 从已改用鸿蒙 vp 的 2.0.1 拆出，未升级 A2UI 协议。原 Skill 中的 `scripts/cli.mjs`、`scripts/online.mjs` 与内核入口现在属于校验器；原维护侧的 `examples/golden/*.ndjson` 现为本目录 `fixtures/golden/*.ndjson`。新的校验器单独发布即可；Agent 仍按单轮流式生成模型可读的 A2UI，端侧继续使用自己的渲染组件和业务函数。
