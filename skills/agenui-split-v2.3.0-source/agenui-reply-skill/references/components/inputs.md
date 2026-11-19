# 输入与操作

## TextField

输入自由文本或数字草稿。

默认启用。可编辑时将 value 绑定到已初始化的字符串路径，label 必填。number 只改变输入外观；草稿不能直接参与数值计算。不要编造 placeholder、onChange 或 error。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`checks`|否|`检查规则[]`|
|`label`|是|`动态<string>`|
|`value`|否|`动态<string>`|
|`variant`|否|`"longText" / "number" / "shortText" / "obscured"`|
|`validationRegexp`|否|`string`|

### 模板片段

#### default

```json
{
  "initialData": {"form":{"name":"周末火锅"}},
  "components": [
    {"id":"focus","component":"TextField","label":"聚餐主题","variant":"shortText","value":{"path":"/form/name"},"styles":{"width":"100%"}}
  ]
}
```

#### multiline

```json
{
  "initialData": {"form":{"name":"周末火锅"}},
  "components": [
    {"id":"focus","component":"TextField","label":"聚餐主题","variant":"longText","value":{"path":"/form/name"},"styles":{"width":"100%"}}
  ]
}
```

#### numberDraft

```json
{
  "initialData": {"form":{"name":"120"}},
  "components": [
    {"id":"focus","component":"TextField","label":"预算草稿（文本，不直接参加数值运算）","variant":"number","value":{"path":"/form/name"},"styles":{"width":"100%"}}
  ]
}
```

#### password

```json
{
  "initialData": {"form":{"name":""}},
  "components": [
    {"id":"focus","component":"TextField","label":"敏感输入示例：不要填写真实凭据","variant":"obscured","value":{"path":"/form/name"},"styles":{"width":"100%"}}
  ]
}
```

## Slider

调节连续数值。

默认启用。明确 min、max；value 绑定已初始化且在范围内的 number。需要派生结果时让 Text 绑定值函数。无已验证的 step，不用显示取整来保证整数人数。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`checks`|否|`检查规则[]`|
|`label`|否|`动态<string>`|
|`min`|否|`number`|
|`max`|是|`number`|
|`value`|是|`动态<number>`|

### 模板片段

#### default

```json
{
  "initialData": {"form":{"amount":250}},
  "components": [
    {"id":"focus","component":"Slider","label":"每人肉量（g，演示参数）","min":100,"max":500,"value":{"path":"/form/amount"},"styles":{"width":"100%"}}
  ]
}
```

## CheckBox

记录独立布尔状态。

默认启用。value 绑定 boolean，不能使用字符串 "true"。若用于已采购标记，只改变该项状态；是否改预算由另行定义的计算关系决定。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`checks`|否|`检查规则[]`|
|`label`|是|`动态<string>`|
|`value`|是|`动态<boolean>`|

### 模板片段

#### default

```json
{
  "initialData": {"form":{"done":false}},
  "components": [
    {"id":"focus","component":"CheckBox","label":"蔬菜已采购","value":{"path":"/form/done"},"styles":{"width":"100%","min-height":"48vp"}}
  ]
}
```

## ChoicePicker

在有限选项中单选或多选。

默认启用。每项有可读 label、稳定 value；单选仍绑定 string[]，最多一项；已选值不能重复且必须出现在 options 中。选择可供展示或提交；只有显式绑定的结果才会联动。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`checks`|否|`检查规则[]`|
|`label`|否|`动态<string>`|
|`variant`|否|`"multipleSelection" / "mutuallyExclusive"`|
|`options`|是|`{label:动态<string>, value:string}[]`|
|`value`|是|`动态<string[]>`|
|`displayStyle`|否|`"checkbox" / "chips"`|
|`filterable`|否|`boolean`|

**本宿主的可选兼容样式**（`styles`）：
- 长度字符串，例如 `"8vp"`：`choice-gap`、`checkbox-item-padding`、`checkbox-margin`、`text-margin`。
- 十六进制颜色字符串（#RRGGBB 或 #RRGGBBAA）：`checkbox-background-color-selected`、`checkbox-border-color`。

### 模板片段

#### default

```json
{
  "initialData": {"form":{"preferences":["mild"]}},
  "components": [
    {"id":"focus","component":"ChoicePicker","label":"需要照顾的口味","variant":"multipleSelection","displayStyle":"chips","filterable":false,"options":[{"label":"🥬 多些蔬菜","value":"vegetables"},{"label":"🍲 清淡锅底","value":"mild"}],"value":{"path":"/form/preferences"},"styles":{"width":"100%"}}
  ]
}
```

#### single

```json
{
  "initialData": {"form":{"preferences":["mild"]}},
  "components": [
    {"id":"focus","component":"ChoicePicker","label":"需要照顾的口味","variant":"mutuallyExclusive","displayStyle":"checkbox","filterable":false,"options":[{"label":"🥬 多些蔬菜","value":"vegetables"},{"label":"🍲 清淡锅底","value":"mild"}],"value":{"path":"/form/preferences"},"styles":{"width":"100%"}}
  ]
}
```

#### checkbox

```json
{
  "initialData": {"form":{"preferences":["mild"]}},
  "components": [
    {"id":"focus","component":"ChoicePicker","label":"需要照顾的口味","variant":"multipleSelection","displayStyle":"checkbox","filterable":false,"options":[{"label":"🥬 多些蔬菜","value":"vegetables"},{"label":"🍲 清淡锅底","value":"mild"}],"value":{"path":"/form/preferences"},"styles":{"width":"100%"}}
  ]
}
```

## DateTimeInput

选择有业务用途的日期或时间。

默认启用。value 绑定合法 ISO 日期、时间、日期时间或空字符串。按需启用 enableDate/enableTime；不填写猜测的日期，时区和系统显示由宿主决定。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`checks`|否|`检查规则[]`|
|`value`|是|`动态<string>`|
|`enableDate`|否|`boolean`|
|`enableTime`|否|`boolean`|
|`min`|否|`动态<string>；字面量格式：date / time / date-time`|
|`max`|否|`动态<string>；字面量格式：date / time / date-time`|
|`label`|否|`动态<string>`|

**本宿主的可选兼容样式**（`styles.compact`）：
- 长度字符串，例如 `"8vp"`：`corner-radius`、`height`、`font-size`。
- 十六进制颜色字符串（#RRGGBB 或 #RRGGBBAA）：`selected-background-color`、`selected-text-color`。

### 模板片段

#### default

```json
{
  "initialData": {"form":{"when":""}},
  "components": [
    {"id":"focus","component":"DateTimeInput","label":"开锅时间（请自行选择）","value":{"path":"/form/when"},"enableDate":true,"enableTime":true,"styles":{"width":"100%"}}
  ]
}
```

#### dateOnly

```json
{
  "initialData": {"form":{"when":""}},
  "components": [
    {"id":"focus","component":"DateTimeInput","label":"开锅时间（请自行选择）","value":{"path":"/form/when"},"enableDate":true,"enableTime":false,"styles":{"width":"100%"}}
  ]
}
```

#### timeOnly

```json
{
  "initialData": {"form":{"when":""}},
  "components": [
    {"id":"focus","component":"DateTimeInput","label":"开锅时间（请自行选择）","value":{"path":"/form/when"},"enableDate":false,"enableTime":true,"styles":{"width":"100%"}}
  ]
}
```

## Button

提交或触发确有接收方的动作。

默认启用。child 引用可见标签节点，文字颜色随该节点设置。action 默认只能声明已启用的动作；点击时使用最新绑定值，生成阶段不执行。不要编造禁用或加载属性。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`checks`|否|`检查规则[]`|
|`child`|是|`组件ID`|
|`variant`|否|`"default" / "primary" / "borderless"`|
|`action`|是|`{functionCall:已启用的动作函数对象}（默认配置）`|

### 模板片段

#### default

```json
{
  "components": [
    {"id":"button_label","component":"Text","text":"按当前条件生成清单","variant":"body","styles":{"font-size":"16vp","font-weight":"bold","color":"#FFFFFF","line-height":1.3,"text-align":"center"}},
    {"id":"focus","component":"Button","child":"button_label","variant":"primary","action":{"functionCall":{"call":"sendMsgToXiaoyi","args":{"query":"请根据当前条件继续生成一份采购清单。"},"returnType":"void"}},"styles":{"min-height":"48vp","padding":"12vp 20vp 12vp 20vp","border-radius":"20vp","align-self":"center","background-color":"#16181D"}}
  ]
}
```

#### secondary

```json
{
  "components": [
    {"id":"button_label","component":"Text","text":"按当前条件生成清单","variant":"body","styles":{"font-size":"16vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"center"}},
    {"id":"focus","component":"Button","child":"button_label","variant":"default","action":{"functionCall":{"call":"sendMsgToXiaoyi","args":{"query":"请根据当前条件继续生成一份采购清单。"},"returnType":"void"}},"styles":{"min-height":"48vp","padding":"12vp 20vp 12vp 20vp","border-radius":"20vp","align-self":"center","background-color":"#FFFFFF","border-color":"#16181D","border-width":"1vp"}}
  ]
}
```

#### text

```json
{
  "components": [
    {"id":"button_label","component":"Text","text":"按当前条件生成清单","variant":"body","styles":{"font-size":"16vp","font-weight":"bold","color":"#0A59F7","line-height":1.3,"text-align":"center"}},
    {"id":"focus","component":"Button","child":"button_label","variant":"borderless","action":{"functionCall":{"call":"sendMsgToXiaoyi","args":{"query":"请根据当前条件继续生成一份采购清单。"},"returnType":"void"}},"styles":{"min-height":"48vp","padding":"12vp 20vp 12vp 20vp","border-radius":"20vp","align-self":"center","background-color":"#FFFFFF00"}}
  ]
}
```
