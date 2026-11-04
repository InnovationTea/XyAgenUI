---
name: agenui-reply
description: 判断回答是否适合使用 Intelligent UI，并生成、校验高德 AGenUI A2UI v0.9 组件消息。用于以结构化展示或交互改善信息理解、方案比较、参数测算、计划安排和信息收集；简单问答、翻译和无需可视化的说明应保留为普通文本。
---

# AGenUI 智能交互回复

生成供已有 AGenUI 宿主渲染的 A2UI 消息。协议与能力以本 Skill 的离线资源为准，不在生成时追随线上最新版。回复语言遵循用户语言与对话上下文。

## 1. 先判断是否需要 UI

生成组件前先阅读 [组件场景选择](references/component-selection.md)，结合用户问题和准备表达的实际内容确定展示模式；不能只按关键词匹配组件。

- `NO_UI`：普通文本或 Markdown 已足够，直接保留文本答案，不生成 A2UI。
- `UI_PRIMARY`：UI 能改善理解、比较、浏览或操作效率，回答主体是结构化信息或交互任务，主要用 A2UI 呈现。

除非用户要求查看决策过程，不单独输出内部模式标签。数据不足时不猜测数值、日期、进度或资源；无法形成有价值且受宿主支持的 UI 时退回文本。

## 2. 根据意图与信息设计交互答案

先识别用户希望完成的任务、需要作出的判断和下一步行动，再梳理已获取的信息：哪些是结论、比较维度、备选项、可调参数、时间安排、偏好和真实媒体资源。把这些信息转化为适合的展示与操作，而不是默认写成长段文字。

确定需要 UI 后再设计组件组合：用摘要与指标突出结论，用卡片和列表组织信息，用表格支持比较，用选择器表达取舍，用滑块和输入框支持测算，用日期控件安排时间，用已支持的切换与展开组件承载不同视角或详情，并通过按钮衔接有接收方的后续行动。适合用户任务时，将展示、选择、调整和继续细化组合在同一回复中。

生成 DSL 前阅读 [视觉与任务组合](references/visual.md)，应用其中的背景与卡片、按钮、图文标签、文字层级、完整多行显示和尺度规则，选择紧凑或宽松密度并保持一致。不得截断文字；超出空间时换行并扩展布局。按信息结构和可执行操作选择组件，不设数量或种类配额。信息不足时可通过有明确用途的输入收集参数，并说明估算依据；不编造价格、图片、地点事实或动作结果。

## 3. 按需选择资源

- 先读 [能力清单](capabilities/index.md) 与实际宿主 profile；未提供其他配置时使用 [默认配置](capabilities/profiles/default.json)。先根据信息结构判断场景，再从本 Skill 的 [组件索引](components/index.md)、本地 catalog 与 profile 中选择组件；不得使用其中未定义的组件或能力。候选组件未被 profile 启用时，按 [组件场景选择](references/component-selection.md) 改用其他已启用组件或退回文本。
- 从 [组件索引](components/index.md) 选择组件，只读取本次使用的组件说明、字段定义；需要具体类型时查本地 catalog。
- 使用函数前阅读 `capabilities/functions/<函数名>.md` 与对应 schema。自定义函数以原始样例为准：`calculateNumber`、`sendMsgToXiaoyi`，严格区分大小写，不改名或使用别名。
- 生成 UI 时必须读 [状态与表达式](references/protocol.md) 和 [流式组织](references/streaming.md)；宿主投递条件见 [宿主契约](references/host.md)。

## 4. 生成协议

使用 `version: "v0.9"`，每条消息仅含一种操作。所有 `UI_PRIMARY` 输出必须能逐批渲染，并以 NDJSON 作为默认交付格式；如有需要可同时提供完整 JSON。默认假设宿主已有 Surface；需要新建时使用 `createSurface`。先定义数据路径和初值，再设计完整组件图与语义区域，根 ID 为 `root`，且 `root` 必须是静态 `Column`，其 `children` 按首屏优先级排列可独立展示的区域组件。

首批必须出现有实际价值、内容完整的首屏区域，不能只创建空 Surface、标题壳或加载占位；后续批次按区域追加。数据初值在首个组件批次前发送一次。每批包含新区域所需的完整递归组件依赖，依赖子组件先于父组件；该批最后更新完整 `root`，其 `children` 累加所有已展示区域，保留完整样式。所有组件须从 `root` 可达，不重复 ID，不漏区域、不重排；已显示输入不得在后续批次重置。每行 NDJSON 是一条完整协议消息。

可变输入使用 `{"path":"/…"}`，初值先通过 `updateDataModel` 写入；静态说明可以直接写文字。单选和多选均绑定字符串数组；中间计算返回 number。按钮参数保留路径、嵌套函数和模板声明，由宿主点击时读取当前状态，禁止生成时把当前值烘焙成提交常量。

仅使用 profile 已启用的组件、值函数、动作及运算符。默认 `calculateNumber` 只支持 `add`、`multiply`。`openUrl`、`resolveCalls` 和 Playground 组件需宿主声明启用。动作只放在 `action.functionCall`，不能混入显示值、模板或嵌套值函数。

日期默认值依据用户/宿主时区和当前时间生成，写入数据模型；不要照抄样例日期。已展示输入不得在后续区域重复初始化，多轮使用宿主保留的状态。

## 5. 生成流、校验并交付

工具目录以本 Skill 为工作目录，首次执行 `npm ci`（Node.js 22+），以后可离线使用。

```sh
node scripts/cli.mjs validate reply.json
node scripts/cli.mjs stream reply.json --regions regions.json --out reply.ndjson
node scripts/cli.mjs validate reply.ndjson --surface existing
```

用户指定新建 Surface 时使用 `--surface new`，并校验时传入相同模式。生成语义区域文件 `regions.json`，按 `root.children` 原顺序把直接子区域完整分组；建议每个内容完整的卡片/主区域单独成批，首批选择最有用的概览。执行完整消息校验、生成 NDJSON、再校验 NDJSON；校验器会按消息顺序检查每个前缀，分批器会检查分批结果。若布局无法表示为静态 Column 根，手工编写同等的逐消息 NDJSON：先 Surface/数据，再逐区域发送完整依赖和累积 root；仍须校验最终完整流。不得因布局复杂而退回仅交付单条完整 updateComponents。工具只组织和校验，不执行函数、不投递消息。

交付前按 [视觉自检](references/visual.md#视觉自检) 检查配色、可读性、层级与布局；协议校验不判断美观。默认交付 `reply.ndjson` 和按需的 `regions.json`；用户需要完整定义时同时提供源 `reply.json`。附上已有宿主按官方 `beginTextStream` → `receiveTextChunk` → `endTextStream` 投递 NDJSON 的必要说明，不要声称校验等于真实端侧运行。可参考 [路线完整样例](examples/route.json) / [流式样例](examples/route.ndjson) 与 [火锅完整样例](examples/hotpot.json) / [流式样例](examples/hotpot.ndjson)，迁移信息结构和流式分区方式，外观按当前视觉规则调整，不照搬题材。
