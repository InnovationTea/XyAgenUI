---
name: agenui-reply
description: 在在线回复中判断文字还是交互界面更适合用户；当比较、测算、计划、信息收集或操作因组件而受益，或用户显式请求 /agenUI 时，按本轮宿主能力选择表达。需要 UI 时逐区生成 A2UI v0.9 NDJSON。
---

# AGenUI 富交互回复

## 1. 先判断这次要表达什么

在输出第一个字符前决定模式。根据准备表达的实际内容判断，不按关键词强行组件化。模式名仅供内部判断，不写进回复。

- **`NO_UI`**：简单事实、概念解释、普通聊天、翻译、润色、简短代码解释，或组件不能明显改善理解。直接输出普通文本或 Markdown，到此结束，无需读取组件模板。
- **`UI_PRIMARY`**：比较、测算、计划、信息收集、结构化浏览或继续操作等任务，组件能明显降低理解或操作成本，且所需数据与能力真实可用。下文只走 UI 流程；结论、假设和限制也写进组件。

例如，“火锅聚会计划里写的 AA 是什么意思？”直接解释；“肉量按 3 人计算，想调每人克数并勾选已采购食材”才需要把输入、结果和清单放在一起。显式 `/agenUI` 优先评估 UI；用户明确要求只回文字、代码或文件时遵照其格式。缺少关键材料或宿主能力时，能独立完成的部分可如实呈现；否则用文字说明或只问决定结果的那个问题。不要虚构库存、预订、发送或联动能力。

## 2. 设计首个可用区域

确认[能力配置](references/host-profile.json)和宿主本轮提供的 surfaceId、已启用组件与函数。先确定用户要看什么差异、调什么输入、记什么状态。测算把输入和受影响的结果放在一起，比较先给同维度差异，清单允许独立勾选。估算标明依据和单位；纯展示不强加按钮，需要交互时每个控件都要改变结果、记录状态或触发真实操作。

读[基础协议](references/protocol.md)和[视觉规则](references/visual.md)，从[组件索引](references/components/index.md)定位本批组件，只读对应章节的场景、参数与模板。沿用模板的字号、间距和色彩，长度按 vp；替换示例 ID、路径、内容与素材。仅当需要校验、格式化、计算或动作时查[官方内置函数](references/functions/builtin.md)或[宿主自定义函数](references/functions/custom.md)。

## 3. 在线逐区输出，每批发送前核对

1. **消息。** 每行一个完整 JSON 对象，`"version":"v0.9"` 加唯一操作，以换行结束。无围栏、旁白、顶层数组或 HTTP 包装。同轮 surfaceId 一致；除非宿主已预建本轮 Surface，否则先发一次 `createSurface`。只在已隔离的本轮容器中使用约定回退 ID `reply`。
2. **数据。** 用 `updateDataModel` 先初始化，再用 `{"path":"/form/value"}` 绑定；组件引用用 ID。Slider 用 number，CheckBox 用 boolean，ChoicePicker 单选也用 string[]，TextField 即便是数字外观仍用 string。计算中间量保留 number，展示再格式化。默认 `calculateNumber` 只支持 add、multiply；整数步进、字符串转数值或任意表达式不能凭空假设。
3. **流式追加。** 每完成一个有用区域即发 `updateComponents`，不等整页。子节点先于父节点，所有引用在本批闭合；完整非空 Column `root` 放最后。后批保留 root 原有属性和子项顺序，只在末尾追加；不重发其他旧节点，不覆盖已显示输入或其上下级数据路径，不修改以前的回复。
4. **动作。** 按钮仅通过已注册的 `action.functionCall` 声明操作；需要当前值时保留绑定，由宿主点击时取值。生成时不执行函数、不调用校验器，不声称已发送或预订。宿主负责校验和转发。

需要核对完整消息顺序时，按场景看一份：[用量联动与采购](references/examples/portion-planner.ndjson)、[多方案比较](references/examples/concert-append.ndjson)、[数字文本输入](references/examples/text-field-number.ndjson)。
