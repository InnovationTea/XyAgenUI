# 协议、状态与表达式

本地 `vendor/agenui_catalog.json` 为固定提交原文。每组件 `.schema.json` 是原始定义的入口，工具在内存构建有效 schema：仅修复 Text 的封闭样式继承，加入自定义函数、能力白名单，以及按配置开启的样例专用样式。不要直接以原始 Text schema 的继承冲突判断所有文字样式非法。

## 基础消息规范

- 协议版本固定为 `v0.9`。每条消息必须有 `version`，并且只能包含一个顶层操作：`createSurface`、`updateDataModel`、`updateComponents` 或 `deleteSurface`。不要把多种操作合并到同一条消息。
- 所有操作都针对一个 `surfaceId`。`createSurface` 使用当前 profile 的 `catalogId`；新建 Surface 后才能向它写数据或组件。默认 existing 模式假设宿主已创建对应 Surface；new 模式必须先创建。数据或组件消息中的 `surfaceId` 必须指向同一个目标 Surface。
- `updateDataModel` 使用 `path` 与 `value` 更新数据模型；`updateComponents` 使用 `components` 更新组件定义。它们是不同的操作，不能把数据初始化对象嵌进组件树，也不能用旧协议字段替代本地 v0.9 定义。
- 回复中的 DSL 流使用 NDJSON：每行一个完整 JSON 对象和一个协议消息，行间以换行分隔；不要用 JSON 数组包裹整条流。宿主应缓存未完整的传输片段，收到换行并得到完整消息后立即解析和应用。单条消息未结束前不能解析为完整协议对象。
- 协议消息的通用结构以本节为基础；组件字段、值类型、枚举及能力必须继续以本地 catalog、组件 schema 和宿主 profile 为准，不能仅凭通用 JSON Schema 或模型记忆推测。

## 组件 ID 与引用关系

- 每个组件定义都必须有 `id` 和 `component`。`id` 是组件实例的身份标识，在同一 Surface 的当前组件集合中必须唯一；它既是组件定义的 ID，也可作为其他组件引用它的目标。不同 Surface 可以各自使用相同 ID。
- 组件之间通过 schema 声明的引用字段连接，不通过嵌套内联组件对象连接。当前已支持的引用位置为：`children` 中的静态 ID 数组、`child`、`Tabs.tabs[].child`、`Modal.trigger`、`Modal.content`。这些字段里的 ID 必须准确匹配同一 Surface 内一个已定义组件的 `id`。
- 动态 `children` 使用模板对象 `{"path":"/items","componentId":"item_template"}`：`path` 是数据模型中数组的路径，`componentId` 是单独定义的模板组件 ID。它同时包含数据绑定和组件引用，二者不可混淆。
- `{"path":"/form/count"}` 等 `path` 绑定指向数据模型，不是组件 ID；组件引用字段中的 ID 也不是数据路径。函数调用、模板插值和 `action.functionCall` 不会自动建立组件引用。
- 引用目标必须存在，不能有悬空 ID、重复 ID 或循环引用。该 Skill 生成的完整 UI 以静态 `Column` 组件 `root` 为入口；所有组件都必须能沿 schema 引用关系从 `root` 到达。`root.children` 按显示顺序列出顶层区域，区域内部再通过组件引用组织成树或受支持的关系图。
- 为便于增量渲染，每条 `updateComponents` 中先放该批新组件所依赖的子组件，再放引用它们的父组件，最后放完整 `root`。每批结束时引用必须已闭合，不能依赖未来批次才会出现的组件。

下例中 `root → summary → body → title` 的 `children` / `child` 字段构成组件关系。列表中的定义先于引用者；组件没有被内联到父组件字段中：

```json
{"version":"v0.9","updateComponents":{"surfaceId":"reply","components":[{"id":"title","component":"Text","text":"方案概览"},{"id":"body","component":"Column","children":["title"]},{"id":"summary","component":"Card","child":"body"},{"id":"root","component":"Column","children":["summary"]}]}}
```

具体操作与消息字段见上方协议及本地 catalog；下面各节分别说明数据路径、表达式和跨批次状态规则。

消息为 `{"version":"v0.9","updateComponents":{"surfaceId":"…","components":[…]}}`，或唯一的 `createSurface`、`updateDataModel`、`deleteSurface` 操作。数据消息使用 `path` 和 `value`，不是旧版 contents 字段。创建使用 profile 的 `catalogId`。UTF-8 文件支持单消息、消息数组或一行一消息的 NDJSON。

## 路径与初值

```json
{"version":"v0.9","updateDataModel":{"surfaceId":"reply","path":"/","value":{"form":{"count":3,"route":["方案一"],"note":"","agreed":false}}}}
```

普通绑定使用绝对 JSON Pointer，如 `/form/count`；`~1` 表示字段名中的斜杠，`~0` 表示波浪号。根路径在本 Skill 的样例和工具中写为 `/`。动态 children 模板内部使用相对路径，如 `name` 或 `details/title`。不要用组件 ID 当数据绑定。工具禁止原型相关路径段及空路径段。

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

同一条 `updateComponents` 中重复定义 ID 是错误；后续消息再次使用已有 ID 时代表以新定义完整替换旧组件，未重述的属性不会自动合并或保留。追加区域时 root 必须带全量已显示 children 及完整样式。后续批次不重复初始化已展示输入；工具对此报 E_STATE_RESET。需要明确重置时使用新 Surface。CLI 验证到流末应已有 root；它能识别截断 JSON、悬空依赖和缺 root，不能识别语法完整但业务上省略了后续区域的流，完整性须由 regions 或宿主业务标记保证。
