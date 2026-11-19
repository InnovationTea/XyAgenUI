# 图片、媒体与网页

## Image

封面、缩略图与头像。

默认启用。url 必须是可直接加载、无凭据的 HTTPS 字面量，styles.width 必须是明确的正宽度字符串。无真实来源时省略图片。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`url`|是|`HTTPS 字面字符串（无凭据）`|
|`description`|否|`动态<string>`|
|`fit`|否|`"contain" / "cover" / "fill" / "none" / "scaleDown"`|
|`variant`|否|`"icon" / "avatar" / "smallFeature" / "mediumFeature" / "largeFeature" / "header"`|

模板中的示例 URL 只展示语法；真实回复须换为可用来源。

### 模板片段

#### default

```json
{
  "components": [
    {"id":"focus","component":"Image","url":"https://assets.example.invalid/template-cover.jpg","description":"火锅聚餐配图：资源由宿主提供","fit":"cover","variant":"mediumFeature","styles":{"width":"100%","aspect-ratio":"3/2","border-radius":"8vp"}}
  ]
}
```

#### thumbnail

```json
{
  "components": [
    {"id":"focus","component":"Image","url":"https://assets.example.invalid/template-cover.jpg","description":"火锅聚餐配图：资源由宿主提供","fit":"cover","variant":"icon","styles":{"width":"64vp","aspect-ratio":"1","border-radius":"8vp","height":"64vp"}}
  ]
}
```

#### avatar

```json
{
  "components": [
    {"id":"focus","component":"Image","url":"https://assets.example.invalid/template-cover.jpg","description":"火锅聚餐配图：资源由宿主提供","fit":"cover","variant":"avatar","styles":{"width":"40vp","aspect-ratio":"1","border-radius":"20vp","height":"40vp"}}
  ]
}
```

## Carousel

浏览多张图片。

默认启用。content 填无凭据、可直接加载的 HTTPS 字面 URL 数组，不接任意组件子树。需要用户自己浏览时关闭 autoplay。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`content`|是|`string[]`|
|`autoplay`|否|`boolean`|
|`draggable`|否|`boolean`|

模板中的示例 URL 只展示语法；真实回复须换为可用来源。

### 模板片段

#### default

```json
{
  "components": [
    {"id":"focus","component":"Carousel","content":["https://assets.example.invalid/template_cover","https://assets.example.invalid/template_detail"],"autoplay":false,"draggable":true,"styles":{"width":"100%","aspect-ratio":"3/2","border-radius":"8vp"}}
  ]
}
```

## Video

展示已有操作视频。

默认启用。url 指向可用资源，实际播放和加载失败由宿主处理。本契约未声明 poster、autoplay 或 controls。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`url`|是|`动态<string>`|

模板中的示例 URL 只展示语法；真实回复须换为可用来源。

### 模板片段

#### default

```json
{
  "initialData": {"assets":{"video":"https://assets.example.invalid/template_video"}},
  "components": [
    {"id":"focus","component":"Video","url":{"path":"/assets/video"},"styles":{"width":"100%","aspect-ratio":"16/9","border-radius":"8vp"}}
  ]
}
```

## AudioPlayer

播放已有语音说明。

默认启用。播放器内的进度只描述媒体播放；保留文字摘要。不能把它当通用进度条、录音控件或任意自动播放入口。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`url`|是|`动态<string>`|
|`description`|否|`动态<string>`|

模板中的示例 URL 只展示语法；真实回复须换为可用来源。

### 模板片段

#### default

```json
{
  "initialData": {"assets":{"audio":"https://assets.example.invalid/template_audio"}},
  "components": [
    {"id":"focus","component":"AudioPlayer","url":{"path":"/assets/audio"},"description":"聚会准备说明","styles":{"width":"100%"}}
  ]
}
```

## Web

嵌入一个已知网页。

默认启用。入口为 url，不接 source、inline HTML 或脚本字段。网页内交互由 WebView 处理，不能推断存在与 A2UI DataModel 的通用桥接。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`url`|是|`动态<string>`|

模板中的示例 URL 只展示语法；真实回复须换为可用来源。

### 模板片段

#### default

```json
{
  "components": [
    {"id":"focus","component":"Web","url":"https://genui.amap.com/","styles":{"width":"100%","height":"320vp","border-radius":"8vp"}}
  ]
}
```
