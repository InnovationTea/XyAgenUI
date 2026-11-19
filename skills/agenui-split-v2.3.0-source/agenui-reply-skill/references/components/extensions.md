# 宿主扩展

## Chart

观察趋势、分布或占比。

默认关闭，仅宿主已注册并启用后使用。使用字面数据点并注明单位和来源；line/bar 用具名系列，donut 可用一个含 label 的系列。没有 tooltip、formatter 或任意交互回调字段。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`chartType`|是|`"line" / "donut" / "bar"`|
|`data`|是|`{xAxis?:string[], yAxis?:string[], series:{name?:string, data:{value:number, label?:string}[]}[]}`|

### 模板片段

#### default

```json
{
  "components": [
    {"id":"focus","component":"Chart","chartType":"bar","data":{"xAxis":["肉类","蔬菜","豆制品"],"series":[{"name":"演示量（g）","data":[{"value":750},{"value":600},{"value":450}]}]},"styles":{"width":"100%","height":"220vp"}}
  ]
}
```

#### line

```json
{
  "components": [
    {"id":"focus","component":"Chart","chartType":"line","data":{"xAxis":["肉类","蔬菜","豆制品"],"series":[{"name":"演示量（g）","data":[{"value":750},{"value":600},{"value":450}]}]},"styles":{"width":"100%","height":"220vp"}}
  ]
}
```

#### donut

```json
{
  "components": [
    {"id":"focus","component":"Chart","chartType":"donut","data":{"xAxis":["肉类","蔬菜","豆制品"],"series":[{"name":"占比","data":[{"label":"肉类","value":750},{"label":"蔬菜","value":600},{"label":"豆制品","value":450}]}]},"styles":{"width":"100%","height":"220vp"}}
  ]
}
```

## Markdown

呈现较长的结构化说明。

默认关闭，仅宿主已注册并启用后使用。独立组件，用 content 接收 Markdown 文本或字符串绑定；与 Text、RichText 同级。标题、代码块的内部样式由扩展渲染器控制。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`content`|是|`动态<string>`|

### 模板片段

#### default

```json
{
  "components": [
    {"id":"focus","component":"Markdown","content":"### 准备事项\n\n- 确认人数与忌口\n- 按到场人数更新用量\n- 分批采购\n\n**说明：** 本内容用于样式联调。","styles":{"width":"100%"}}
  ]
}
```

## Lottie

非必要的轻量动效。

默认关闭，仅宿主已注册并启用后使用。只在已有可用动画资源时使用；loop 与 autoPlay 控制播放，不代表业务进度。系统的减少动效偏好需由宿主落实。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`url`|是|`动态<string>`|
|`loop`|否|`boolean`|
|`autoPlay`|否|`boolean`|
|`variant`|否|`"icon" / "small" / "medium" / "large"`|

模板中的示例 URL 只展示语法；真实回复须换为可用来源。

### 模板片段

#### default

```json
{
  "initialData": {"assets":{"lottie":"https://assets.example.invalid/template_animation"}},
  "components": [
    {"id":"focus","component":"Lottie","url":{"path":"/assets/lottie"},"loop":false,"autoPlay":false,"variant":"small","styles":{"width":"48vp","height":"48vp"}}
  ]
}
```
