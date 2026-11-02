# 已有端侧接入契约

首次渲染前注册 profile 中的函数及组件，尤其自定义 `calculateNumber`、`sendMsgToXiaoyi`。须注册 `AGenUI.registerDeepParseProperty('Button', 'action')`，使 action 参数/事件 context 在点击时按当前模型深解析。注册顺序不得晚于首个组件创建。

按固定版本官方流会话 API 投递：`beginTextStream` → `receiveTextChunk`（多次）→ `endTextStream`。消息与分块可跨传输块，完整 NDJSON 行仍需保持边界；取消和异常也要结束/清理会话。具体宿主签名、句柄和线程要求按其 SDK；此工具不创建会话、不推送消息。

宿主负责：

- 注册与 profile 对应的实际实现，保证 calculateNumber 的 left/right、operator、返回类型语义及消息接收方一致。
- 对输入做过滤、范围限制和业务校验；互斥选择按官方 string[] 规范写回。样例仅提供初值，不自动实现“无特殊需求”与其他项互斥。
- 路径依赖变更时刷新显示；点击时读取最新值并处理嵌套调用/模板，禁止在渲染时预执行发送动作。
- 实际发送 sendMsgToXiaoyi.query 与快照，提供发送中、成功/失败反馈，防止重复点击；生成 DSL 不能声称已发送。
- 多轮保留 Surface 与数据模型，避免流式更新覆盖已编辑输入；并发更新、取消、清理和权限由宿主管理。

必须在真实端侧验收：双滑块联动；修改选择后点击得到最新数组；嵌套计算与模板一致；日期格式和时区；消息回传、失败反馈、流式首区出现、多轮保留。Node 校验及重放仅证明声明与结构满足约束。

官方依据均固定到 `5c347a8352c1afff31879bcf5af4101df4f94137`：[API 中文文档](https://github.com/AGenUI/AGenUI/blob/5c347a8352c1afff31879bcf5af4101df4f94137/docs/API.zh-CN.md)、[Harmony 注册入口](https://github.com/AGenUI/AGenUI/blob/5c347a8352c1afff31879bcf5af4101df4f94137/platforms/harmony/agenui/src/main/ets/agenui/AGenEngineUI.ets)、[组件替换实现](https://github.com/AGenUI/AGenUI/blob/5c347a8352c1afff31879bcf5af4101df4f94137/core/src/surface/component_manager/agenui_component_manager.cpp)。上述关键结论已写入本地契约，使用 Skill 时无需联网读取。
