# 函数生成契约

函数必须同时满足当前 profile 启用、有效函数 Schema 接受、宿主实际注册三个条件。组件 Schema 只在 DynamicValue 属性接受函数对象时允许调用值函数。遵循函数自己的 Schema：许多官方函数将 `returnType` 设为可选或固定值，不要机械添加。复杂计算默认使用结构化函数对象；属性中间值保持数字，只有最终文字展示才调用 `formatNumber`。函数名及参数大小写敏感。

## 两种调用位置

| 类型 | 位置 | 行为 |
|---|---|---|
| 值函数 | 接受 DynamicValue 的组件属性、检查规则或另一值函数的参数 | 渲染/解析值；不得调用动作或产生副作用。嵌套输入和返回类型必须匹配目标属性。 |
| 动作函数 | `Button.action.functionCall` | 仅在用户点击时调用。绑定参数保持动态声明，点击时读取最新数据；模型生成期间不执行。 |
| 事件 | `Button.action.event` | 仅可用宿主 profile 已声明的接收名称；字段只按 Action Schema 编写。 |

事件和 functionCall 是 Action 的两种互斥形状；不要把它们并排放进同一个 action。动作函数不能放在 Text、模板插值、值函数参数或 `resolveCalls` 内。

## 默认安全写法

数据绑定使用 `{"path":"/form/pending"}`，路径必须已初始化且类型正确。计算默认用完整结构化函数对象，推荐字段顺序为 `call`、`returnType`、`args`；参数对象遵循具体函数 Schema：

```json
{"call":"calculateNumber","returnType":"number","args":{"left":3,"right":{"path":"/form/pending"},"operator":"add"}}
```

需要展示格式化数字时，外层 `formatNumber`，内层仍返回 number：

```json
{"call":"formatNumber","returnType":"string","args":{"value":{"call":"calculateNumber","returnType":"number","args":{"left":3,"right":{"path":"/form/pending"},"operator":"add"}},"decimals":0,"grouping":false}}
```

默认 `calculateNumber` 只支持 `add`、`multiply`。不要写 `divide`、`subtract`、条件分支或 profile 未声明的运算。如果当前函数集合无法表达关键联动，在开始输出前改为普通文字；若交互输入仍有独立用途，可保留输入并明确说明不能实时计算，不能伪称联动有效。

简单文案可直接使用已确认路径插值，例如 `"当前人数 ${/form/pending} 人"`。仅在需要函数表达式的插值时用具名参数模板；模板语法自由度低于 JSON 结构化调用，复杂公式优先对象形式。不要在 `${…}` 中写多层程序表达式。所有反斜线和换行仍遵循 JSON 字符串转义。

动作示例（`Button.action` 的值，不是完整组件）：

```json
{"functionCall":{"call":"sendMsgToXiaoyi","args":{"query":"按当前输入继续","count":{"path":"/form/pending"}}}}
```

`sendMsgToXiaoyi` 是默认宿主自定义动作，`query` 必填；快照字段可使用 DynamicValue。`openUrl` 默认未启用，只有宿主 profile 同时启用 `functions` 与 `actions` 才能使用。`resolveCalls` 默认关闭，启用时仍是值函数，不能用于动作深解析。

## 常见错误

```json
{"call":"formatNumber","returnType":"number","args":{"value":{"path":"/form/name"}}}
{"call":"calculateNumber","returnType":"number","args":{"left":10,"right":{"path":"/form/divisor"},"operator":"divide"}}
{"call":"sendMsgToXiaoyi","args":{"query":"马上发送"}}
{"functionCall":{"call":"calculateNumber","args":{"left":1,"right":2,"operator":"add"}}}
```

这些示例分别把 string 路径传入数字参数、使用 profile 不支持的运算符、将动作函数当值调用，或把值函数放进 Button action。必须按函数类型、目标属性返回类型及 profile 能力修正；值函数完整对象需要 `returnType` 时按该函数 Schema 写明。
