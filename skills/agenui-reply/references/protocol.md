# 协议、状态与表达式

本地 `vendor/agenui_catalog.json` 为固定提交原文。每组件 `.schema.json` 是原始定义的入口，工具在内存构建有效 schema：仅修复 Text 的封闭样式继承，加入自定义函数、能力白名单，以及按配置开启的样例专用样式。不要直接以原始 Text schema 的继承冲突判断所有文字样式非法。

消息为 `{"version":"v0.9","updateComponents":{"surfaceId":"…","components":[…]}}`，或唯一的 `createSurface`、`updateDataModel`、`deleteSurface` 操作。数据消息使用 `path` 和 `value`，不是旧版 contents 字段。创建使用 profile 的 `catalogId`。UTF-8 文件支持单消息、消息数组或一行一消息的 NDJSON。

## 路径与初值

```json
{"version":"v0.9","updateDataModel":{"surfaceId":"reply","path":"/","value":{"form":{"count":3,"route":["方案一"],"note":"","agreed":false}}}}
```

普通绑定使用绝对 JSON Pointer，如 `/form/count`；`~1` 表示字段名中的斜杠，`~0` 表示波浪号。动态 children 为 `{"path":"/items","componentId":"item_template"}`，模板内部用相对路径如 `name` 或 `details/title`。不要用组件 ID 当数据绑定。工具禁止原型相关路径段及空路径段。

Slider→number；ChoicePicker→string[]（mutuallyExclusive 最多一项）；CheckBox→boolean；DateTimeInput→ISO 8601 string 或空字符串；TextField 包括 number 变体→string。静态显示不必迁入数据模型。工具检查绑定存在、类型、选项和数值范围，不替代宿主输入过滤。

## 函数与模板

```json
{"call":"calculateNumber","returnType":"number","args":{"left":3,"right":{"path":"/form/count"},"operator":"add"}}
```

具名参数，递归嵌套；中间结果 number，显示可经 formatNumber 转 string。完整函数对象的 calculateNumber 必须写 returnType；模板里的函数调用由解析器推导类型。例：`${formatNumber(value:calculateNumber(left:3,right:${/form/count},operator:'add'),decimals:0)}`。普通字符串也支持 `${/form/count}`，无需强制包装 formatString。JSON 中写 `\\${` 可得到字面量起始符；注意 JSON 反斜线自身也要转义。解析器只分析表达式，不使用 eval、不执行函数。

```json
{"id":"submit","component":"Button","child":"submit_label","action":{"functionCall":{"call":"sendMsgToXiaoyi","args":{"query":"按当前人数 ${/form/count} 继续细化","count":{"path":"/form/count"}}}}}
```

动作函数仅用于 `action.functionCall`，值函数和模板不能调用 sendMsgToXiaoyi/openUrl；resolveCalls 内同样禁止动作。按钮参数保留动态声明，点击前不替换成初值。事件只允许 profile 已声明的接收名称。

## 状态连续

默认 existing 模式假设宿主已创建同名 Surface；new 模式要求显式创建。每次校验一段完整流，或用 `--state` 提供宿主保留的数据：`{"reply":{"form":{"count":5}}}`。完整 UI 可引用该数据而省略初始化。

同 ID 组件是完整替换，遗漏的属性会丢失。追加区域时 root 必须带全量已显示 children 及完整样式。后续批次不重复初始化已展示输入；工具对此报 E_STATE_RESET。需要明确重置时使用新 Surface。CLI 验证到流末应已有 root；它能识别截断 JSON、悬空依赖和缺 root，不能识别语法完整但业务上省略了后续区域的流，完整性须由 regions 或宿主业务标记保证。
