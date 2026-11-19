# 布局与分组

## Column

纵排与根布局。

默认启用。排列跨行内容；同组用 gap，只有主要语义区域需要外壳。root 变体用作回复根时，将示例的 focus 改为 root，children 使用静态 ID 列表。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`children`|是|`组件ID[] 或 {path:string,componentId:组件ID}`|
|`justify`|否|`"start" / "center" / "end" / "spaceBetween" / "spaceAround" / "spaceEvenly" / "stretch"`|
|`align`|否|`"center" / "end" / "start" / "stretch"`|

### 模板片段

#### default

```json
{
  "components": [
    {"id":"heading","component":"Text","text":"🥘 人数与用量","variant":"h3","styles":{"font-size":"20vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}},
    {"id":"paragraph","component":"Text","text":"先按 3 人准备，可按到场人数调整。","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"focus","component":"Column","children":["heading","paragraph"],"styles":{"gap":"12vp"}}
  ]
}
```

#### tight

```json
{
  "components": [
    {"id":"heading","component":"Text","text":"🥘 人数与用量","variant":"h3","styles":{"font-size":"20vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}},
    {"id":"paragraph","component":"Text","text":"先按 3 人准备，可按到场人数调整。","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"focus","component":"Column","children":["heading","paragraph"],"styles":{"gap":"8vp"}}
  ]
}
```

#### section

```json
{
  "components": [
    {"id":"heading","component":"Text","text":"🥘 人数与用量","variant":"h3","styles":{"font-size":"20vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}},
    {"id":"paragraph","component":"Text","text":"先按 3 人准备，可按到场人数调整。","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"focus","component":"Column","children":["heading","paragraph"],"styles":{"gap":"16vp"}}
  ]
}
```

#### root

```json
{
  "components": [
    {"id":"heading","component":"Text","text":"🥘 人数与用量","variant":"h3","styles":{"font-size":"20vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}},
    {"id":"paragraph","component":"Text","text":"先按 3 人准备，可按到场人数调整。","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"focus","component":"Column","children":["heading","paragraph"],"styles":{"padding":"16vp","gap":"16vp","background-color":"#F1F3F5","border-radius":"20vp"}}
  ]
}
```

## Row

并排短字段或操作。

默认启用。数量和单位、图标和标题等短项可横排；长标题、大字体导致拥挤时改用 Column。横排本身不计算数值。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`children`|是|`组件ID[] 或 {path:string,componentId:组件ID}`|
|`justify`|否|`"center" / "end" / "spaceAround" / "spaceBetween" / "spaceEvenly" / "start" / "stretch"`|
|`align`|否|`"start" / "center" / "end" / "stretch"`|

### 模板片段

#### default

```json
{
  "components": [
    {"id":"label","component":"Text","text":"预计人数","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"value","component":"Text","text":"3 人","variant":"h3","styles":{"font-size":"20vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}},
    {"id":"focus","component":"Row","children":["label","value"],"align":"center","styles":{"gap":"8vp"},"justify":"spaceBetween"}
  ]
}
```

#### titleGroup

```json
{
  "components": [
    {"id":"label","component":"Text","text":"预计人数","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"value","component":"Text","text":"3 人","variant":"h3","styles":{"font-size":"20vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}},
    {"id":"focus","component":"Row","children":["label","value"],"align":"center","styles":{"gap":"8vp"},"justify":"start"}
  ]
}
```

#### actions

```json
{
  "components": [
    {"id":"label","component":"Text","text":"预计人数","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"value","component":"Text","text":"3 人","variant":"h3","styles":{"font-size":"20vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}},
    {"id":"focus","component":"Row","children":["label","value"],"align":"center","styles":{"gap":"12vp","flex-wrap":"wrap"},"justify":"center"}
  ]
}
```

## Card

分隔完整任务区。

默认启用。只有一个 child；多项内容放在其内部的 Column。glass 适合已有合格背景图的场景，不能添加 blur 或 backdrop-filter。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`child`|是|`组件ID`|

### 模板片段

#### default

```json
{
  "components": [
    {"id":"heading","component":"Text","text":"🥘 食材用量","variant":"h3","styles":{"font-size":"20vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}},
    {"id":"bodytext","component":"Text","text":"数据为界面联调示例，实际按食量调整。","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"body","component":"Column","children":["heading","bodytext"],"styles":{"gap":"12vp"}},
    {"id":"focus","component":"Card","child":"body","styles":{"background-color":"#FFFFFF","border-radius":"16vp","padding":"16vp 16vp 16vp 16vp"}}
  ]
}
```

#### result

```json
{
  "components": [
    {"id":"heading","component":"Text","text":"🥘 食材用量","variant":"h3","styles":{"font-size":"20vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}},
    {"id":"bodytext","component":"Text","text":"数据为界面联调示例，实际按食量调整。","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"body","component":"Column","children":["heading","bodytext"],"styles":{"gap":"12vp"}},
    {"id":"focus","component":"Card","child":"body","styles":{"background-color":"#EEF4FF","border-radius":"16vp","padding":"16vp 16vp 16vp 16vp"}}
  ]
}
```

#### spacious

```json
{
  "components": [
    {"id":"heading","component":"Text","text":"🥘 食材用量","variant":"h3","styles":{"font-size":"20vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}},
    {"id":"bodytext","component":"Text","text":"数据为界面联调示例，实际按食量调整。","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"body","component":"Column","children":["heading","bodytext"],"styles":{"gap":"12vp"}},
    {"id":"focus","component":"Card","child":"body","styles":{"background-color":"#FFFFFF","border-radius":"16vp","padding":"24vp 24vp 24vp 24vp"}}
  ]
}
```

#### glass

```json
{
  "components": [
    {"id":"heading","component":"Text","text":"🥘 食材用量","variant":"h3","styles":{"font-size":"20vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}},
    {"id":"bodytext","component":"Text","text":"数据为界面联调示例，实际按食量调整。","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"body","component":"Column","children":["heading","bodytext"],"styles":{"gap":"12vp"}},
    {"id":"focus","component":"Card","child":"body","styles":{"background-color":"rgba(255,255,255,0.96)","border-radius":"16vp","padding":"16vp 16vp 16vp 16vp"}}
  ]
}
```

## Divider

区分相邻分组。

默认启用。留白不足以区分分组时再加分隔线。它无交互状态，不假设背景色能改变原生线色。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`axis`|否|`"horizontal" / "vertical"`|

### 模板片段

#### default

```json
{
  "components": [
    {"id":"focus","component":"Divider","axis":"horizontal","styles":{"margin":"8vp 0vp 8vp 0vp"}}
  ]
}
```
