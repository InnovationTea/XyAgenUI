# 文字、图标与表格

## Text

标题、正文与动态指标。

默认启用。展示文字、数据路径或字符串值函数。正文完整展示时省略 styles.line-clamp；仅非关键摘要使用 3，禁用 0。数值先格式化为字符串。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`text`|是|`动态<string>`|
|`variant`|否|`"h1" / "h2" / "h3" / "h4" / "h5" / "caption" / "body"`|

### 模板片段

#### default / body

```json
{
  "components": [
    {"id":"focus","component":"Text","text":"先调整预计人数，再按实际食量选择每人用量。","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}}
  ]
}
```

#### page

```json
{
  "components": [
    {"id":"focus","component":"Text","text":"先调整预计人数，再按实际食量选择每人用量。","variant":"h1","styles":{"font-size":"30vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}}
  ]
}
```

#### group

```json
{
  "components": [
    {"id":"focus","component":"Text","text":"先调整预计人数，再按实际食量选择每人用量。","variant":"h2","styles":{"font-size":"24vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}}
  ]
}
```

#### section

```json
{
  "components": [
    {"id":"focus","component":"Text","text":"先调整预计人数，再按实际食量选择每人用量。","variant":"h3","styles":{"font-size":"20vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}}
  ]
}
```

#### subheading

```json
{
  "components": [
    {"id":"focus","component":"Text","text":"先调整预计人数，再按实际食量选择每人用量。","variant":"h4","styles":{"font-size":"18vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}}
  ]
}
```

#### hint

```json
{
  "components": [
    {"id":"focus","component":"Text","text":"先调整预计人数，再按实际食量选择每人用量。","variant":"body","styles":{"font-size":"14vp","font-weight":"normal","color":"#555D66","line-height":1.5,"text-align":"left"}}
  ]
}
```

#### caption

```json
{
  "components": [
    {"id":"focus","component":"Text","text":"先调整预计人数，再按实际食量选择每人用量。","variant":"caption","styles":{"font-size":"12vp","font-weight":"normal","color":"#555D66","line-height":1.3,"text-align":"left"}}
  ]
}
```

#### metric

```json
{
  "components": [
    {"id":"focus","component":"Text","text":"先调整预计人数，再按实际食量选择每人用量。","variant":"h2","styles":{"font-size":"38vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}}
  ]
}
```

#### button

```json
{
  "components": [
    {"id":"focus","component":"Text","text":"先调整预计人数，再按实际食量选择每人用量。","variant":"body","styles":{"font-size":"16vp","font-weight":"bold","color":"#FFFFFF","line-height":1.3,"text-align":"left"}}
  ]
}
```

#### summary

```json
{
  "components": [
    {"id":"focus","component":"Text","text":"先调整预计人数，再按实际食量选择每人用量。","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"line-clamp":3,"text-align":"left"}}
  ]
}
```

## RichText

短 HTML 富文本。

默认启用。text 只用受支持的富文本标签；按需开启链接。不要套用 Text 的 font-size 或 line-clamp，也不承载网页脚本。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`text`|是|`动态<string>`|
|`variant`|否|`"h1" / "h2" / "h3" / "h4" / "h5" / "caption" / "body"`|
|`linksEnable`|否|`boolean`|

### 模板片段

#### default

```json
{
  "components": [
    {"id":"focus","component":"RichText","text":"<p><b>准备提醒</b></p><p>先确认人数与忌口，再确定采购份量。</p>","variant":"body","linksEnable":false,"styles":{"width":"100%"}}
  ]
}
```

## Icon

辅助识别。

默认启用。展示允许的图标名等 name 表示；需要点击时放入 Button，并保留可读标签。不能从图标本身触发业务动作。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`name`|是|`"accountCircle" / "add" / "arrowBack" / "arrowForward" / "attachFile" / "calendarToday" / "call" / "camera" / "check" / "close" / "delete" / "download" / "edit" / "event" / "error" / "fastForward" / "favorite" / "favoriteOff" / "folder" / "help" / "home" / "info" / "locationOn" / "lock" / "lockOpen" / "mail" / "menu" / "moreVert" / "moreHoriz" / "notificationsOff" / "notifications" / "pause" / "payment" / "person" / "phone" / "photo" / "play" / "print" / "refresh" / "rewind" / "search" / "send" / "settings" / "share" / "shoppingCart" / "skipNext" / "skipPrevious" / "star" / "starHalf" / "starOff" / "stop" / "upload" / "visibility" / "visibilityOff" / "volumeDown" / "volumeMute" / "volumeOff" / "volumeUp" / "warning" 或 {svgPath:string} 或 {path:string}`|

### 模板片段

#### default

```json
{
  "components": [
    {"id":"focus","component":"Icon","name":"shoppingCart","styles":{"width":"20vp","height":"20vp"}}
  ]
}
```

## Table

少列同维度对比。

默认启用。columns 是字符串列名，rows 是二维字符串数组；每行的长度必须等于列数。单元格不接受组件、path 或函数；实时结果改用绑定了数据的 Text。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`columns`|是|`string[]`|
|`rows`|是|`string[][]`|

### 模板片段

#### default

```json
{
  "components": [
    {"id":"focus","component":"Table","columns":["项目","3 人演示量"],"rows":[["肉类合计","750 g"],["蔬菜","600 g"],["饮料","1.5 L"]],"styles":{"width":"100%"}}
  ]
}
```
