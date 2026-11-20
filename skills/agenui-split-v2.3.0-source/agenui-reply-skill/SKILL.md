---
name: agenui-reply
description: 为 /agenUI 或宿主启用的 AGenUI 回复生成交互界面。激活后直接逐区输出 A2UI v0.9 NDJSON，用组件承载完整回答、相关图片和可联动的结果。
---

# AGenUI 富交互回复

## 1. 直接生成 DSL

调用本 Skill 后，直接生成 A2UI v0.9 DSL。整个公开回复只输出原始 NDJSON，从首条协议消息到末尾换行。简答用精简的 `Text` 区域。缺少关键资料时，用 `Text` 说明限制或提出必要的澄清问题。

## 2. 设计首个可用区域

在内部列出完整回答要包含的结论、细节、步骤、限制和来源，并分配到各区域。首区直接给可用结论或输入和结果，后续逐区补齐细节。对于适合用图的对象、地点或步骤，主动选用已知可直连的相关图，并保留文字解释。

确认[能力配置](references/host-profile.json)和宿主本轮提供的 surfaceId、组件与函数。每个输入先确定它写入的路径，以及读取该路径的其他可见结果或动作。测算、筛选、切换方案时，让输入更新所有业务上受影响的指标、明细或说明。交互仅用于记录或提交时，明确用途。详细做法见[完整内容、配图与联动](references/reply-design.md)。

读[基础协议](references/protocol.md)和[视觉规则](references/visual.md)，从[组件索引](references/components/index.md)定位本批组件，只读对应章节的场景、参数与模板。沿用模板的字号、间距和色彩，长度按 vp；替换示例 ID、路径、内容与素材。仅当需要校验、格式化、计算或动作时查[官方内置函数](references/functions/builtin.md)或[宿主自定义函数](references/functions/custom.md)。

## 3. 在线逐区输出，每批发送前核对

1. **消息。** 每行一个完整 JSON 对象，`"version":"v0.9"` 加唯一操作，以换行结束。无围栏、旁白、顶层数组或 HTTP 包装。同轮 surfaceId 一致；除非宿主已预建本轮 Surface，否则先发一次 `createSurface`。只在已隔离的本轮容器中使用约定回退 ID `reply`。
2. **数据。** 用 `updateDataModel` 先初始化，再用 `{"path":"/form/value"}` 绑定；组件引用用 ID。Slider 用 number，CheckBox 用 boolean，ChoicePicker 单选也用 string[]，TextField 即便是数字外观仍用 string。计算中间量保留 number，展示再格式化。默认 `calculateNumber` 只支持 add、multiply；整数步进、字符串转数值或任意表达式不能凭空假设。
3. **流式追加。** 每完成一个有用区域即发 `updateComponents`，不等整页。子节点先于父节点，所有引用在本批闭合；完整非空 Column `root` 放最后。后批保留 root 原有属性和子项顺序，只在末尾追加；不重发其他旧节点，不覆盖已显示输入或其上下级数据路径，不修改以前的回复。
4. **联动与动作。** 核对本批输入的绑定路径被其他结果实际读取，改变输入能改变对应结果。动作使用已注册的 `action.functionCall`，点击时读取最新绑定值。生成时不执行函数、不调用校验器。宿主负责校验和转发。
5. **内容。** 每批核对本区信息有可达组件承载。最后对照回答清单补齐遗漏区域，关键信息可完整阅读，回复以最后一条 NDJSON 的换行结束。

按场景查看样例：[多结果联动与采购](references/examples/portion-planner.ndjson)、[图文与整组视角切换](references/examples/moon-mars.ndjson)、[分区追加比较](references/examples/concert-append.ndjson)、[数字文本输入](references/examples/text-field-number.ndjson)。
