# 组件生成契约

本页是模型生成时的快速规则；单个组件的字段和枚举以紧邻的 `.schema.json` 及固定 `vendor/agenui_catalog.json` 为准。契约冲突时按有效 Schema 收敛，不能从历史样例推导新字段。每个组件对象都必须有唯一 `id` 和 `component`；以下组件短契约列出的字段之外，不要补猜测属性。

## 交互值类型

| 组件 | 必填字段（除 `id`、`component` 外） | `value` 绑定类型 | 生成规则 |
|---|---|---|---|
| `Slider` | `max`、`value` | number | `min` 默认为 0；明确范围、单位和落在范围内的初值。Schema 没有 `step`，不得添加。 |
| `ChoicePicker` | `options`、`value` | string[] | 单选仍是数组；`mutuallyExclusive` 数组至多一项。初值只能是选项 `value` 的子集。 |
| `CheckBox` | `label`、`value` | boolean | 绑定路径初值必须是 `true` 或 `false`。 |
| `TextField` | `label` | string | 包括 `variant: "number"` 在内，值和初值都为字符串；数字过滤和转换属于宿主职责。 |
| `DateTimeInput` | `value` | ISO 8601 string | 未选择时使用空字符串；日期、时间及范围配置保持同一格式。 |

初始值必须先由 `updateDataModel` 写入，再在组件 `value` 中绑定相同路径。完整 UI 中为这一轮状态初始化一次；后续追加区域不可重复初始化或用初始值覆盖用户改动。绑定路径必须存在且类型正确。已有宿主状态由宿主契约提供时，按该状态绑定，不要臆造或重置。

## 常用组件短契约

| 组件 | 必填字段（除 `id`、`component` 外） | 关键类型和限制 |
|---|---|---|
| `Text` | `text` | `text` 是字符串、字符串路径绑定或返回 string 的值函数；variant 只使用 Schema 枚举。仅长描述摘要设置 `styles.line-clamp: 3`；短字段和完整显示文本省略该属性，不写 0。 |
| `Image` | `url` | 始终显式设置非零 `styles.width`；仅使用可直接加载的 HTTPS 图片直链。静态检查不能证明域名无防盗链或设备可达，无法确认时使用纯色回退。 |
| `Row`、`Column`、`List` | `children` | 静态形式是组件 ID 字符串数组；动态形式严格为 `{"path":"/items","componentId":"item_template"}`。模板组件应单独定义。 |
| `Card` | `child` | 单个组件 ID。多个内容先放入 `Column` 或 `Row`，再引用容器 ID。 |
| `Tabs` | `tabs` | 每项仅含 Schema 定义的字段；`child` 是组件 ID。 |
| `Modal` | `trigger`、`content` | 两者都是已定义组件的 ID，不是内嵌对象或数据路径。 |
| `Button` | `child`、`action` | `child` 指向可见标签组件；action 采用事件或 `functionCall` 的一种合法 Schema 结构。动作函数只在点击时运行。 |
| `Table` | `columns`、`rows` | 列名为字符串数组；每行是字符串数组，单行项数必须与列数相同。 |
| `RichText` | `text` | 仅使用宿主支持的轻量标签及 Schema 字段；当前有效 Schema 未确认 `line-clamp` 前，不要强加此样式。 |

本 Skill 的 Text 生成约束比原始 catalog 更严格：虽然快照将非正 `line-clamp` 描述为不限行，当前输出和校验器不接受该写法；完整显示时省略属性，仅长描述摘要使用 3，关键日期、价格和操作条件须完整可见。

## 最小合法对象

以下是组件对象片段，不是完整 A2UI 消息。它们用于展示字段形状；动态输入还要求在之前的 `updateDataModel` 消息中初始化对应路径。

```json
{"id":"title","component":"Text","text":"标题"}
{"id":"name","component":"TextField","label":"姓名","value":{"path":"/form/name"}}
{"id":"count","component":"Slider","min":1,"max":10,"value":{"path":"/form/count"}}
{"id":"choice","component":"ChoicePicker","variant":"mutuallyExclusive","options":[{"label":"方案 A","value":"a"}],"value":{"path":"/form/choice"}}
{"id":"photo","component":"Image","url":"https://images.example.org/photo.jpg","styles":{"width":"100%"}}
```

最后一例中的图片主机仅为语法占位，不能当成已验证资源使用。没有实际确认可用的图片 URL 时，不要输出示例 URL。

## 常见错误

```json
{"id":"count","component":"Slider","max":10,"step":1,"value":{"path":"/form/count"}}
{"id":"choice","component":"ChoicePicker","options":[{"label":"A","value":"a"}],"value":{"path":"/form/choice"}}
{"id":"photo","component":"Image","url":"http://example.org/a.jpg"}
{"id":"card","component":"Card","child":{"id":"body","component":"Text","text":"内嵌组件"}}
```

这些对象分别错误地添加了不支持字段、把单选值暗示为非数组、使用明文 HTTP，或将组件对象内嵌到 ID 引用字段。修复原则是删除未声明字段、保持值类型、只引用已定义组件 ID，并为 Image 补非零宽度和 HTTPS 直链。
