# 安装 agenui-reply · v2.3.0

将本目录整体放入 Agent 的 Skill 目录。升级时整目录替换，避免旧组件单页和新分册同时被检索。此目录不需要 Node，也不需要启动校验服务才能读取。

宿主在支持 A2UI 的通道调用本 Skill，并把本轮全部模型增量送入 A2UI 流式校验。模型一经调用就按 [SKILL.md](SKILL.md) 生成 DSL。接入说明见双目录源码包的 validator/docs/AGENT-INTEGRATION.md。

| 资料 | 什么时候读 |
|---|---|
| [协议](references/protocol.md)、[能力快照](references/host-profile.json) | 确认单轮消息顺序、数据作用域与本轮允许能力。|
| [完整内容、配图与联动](references/reply-design.md) | 把回答清单分配到区域，并核对媒体来源、输入路径与结果。|
| [视觉](references/visual.md)、[样式字段](references/style-fields.md) | 选取字体、颜色、间距和 vp 尺寸，核对某个样式的字段类型。|
| [组件索引](references/components/index.md) | 按任务找到组件，跳到六个分册中的对应章节；场景、边界、参数和模板在一起。|
| [内置函数](references/functions/builtin.md)、[自定义及项目补录函数](references/functions/custom.md) | 核实参数和返回值，区别已收录签名与当前可用能力。|
| [用量测算](references/examples/portion-planner.ndjson)、[图文比较](references/examples/moon-mars.ndjson)、[分区追加比较](references/examples/concert-append.ndjson)、[数字文本输入](references/examples/text-field-number.ndjson) | 需要核对完整在线消息时选一份。|

校验契约仍与 v2.1.0 一致。Agent 读取[契约指纹](generated/contract-stamp.json)，不要让模型生成它。真实业务函数、渲染与设备验收由宿主负责。[上游来源与许可](licenses/SOURCE.md)。
