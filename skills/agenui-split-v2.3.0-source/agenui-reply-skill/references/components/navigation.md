# 列表、页签与弹层

## List

重复条目与采购勾选。

默认启用。静态列表引用 ID；动态列表引用数据数组和模板组件 ID，模板内用相对路径写回对应条目。显示过的输入列表不能由后批替换；不承诺拖拽、侧滑或分页。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`children`|是|`组件ID[] 或 {path:string,componentId:组件ID}`|
|`direction`|否|`"vertical" / "horizontal"`|
|`align`|否|`"start" / "center" / "end" / "stretch"`|

### 模板片段

#### default

```json
{
  "initialData": {"items":[{"id":"beef","name":"牛肉","amount":"演示：450 g","done":false},{"id":"veg","name":"蔬菜","amount":"演示：600 g","done":false}]},
  "components": [
    {"id":"item_name","component":"Text","text":{"path":"name"},"variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"item_amount","component":"Text","text":{"path":"amount"},"variant":"body","styles":{"font-size":"14vp","font-weight":"normal","color":"#555D66","line-height":1.5,"text-align":"left"}},
    {"id":"item_done","component":"CheckBox","label":"已采购","value":{"path":"done"}},
    {"id":"item","component":"Column","children":["item_name","item_amount","item_done"],"styles":{"gap":"8vp","padding":"12vp 0vp 12vp 0vp"}},
    {"id":"focus","component":"List","direction":"vertical","children":{"path":"/items","componentId":"item"},"styles":{"width":"100%"}}
  ]
}
```

## Tabs

切换同一任务的视角。

默认启用。每个标签用 title 和 child，child 只填组件 ID；切换由原生页签处理。当前没有可生成的选中索引或切换回调。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`tabs`|是|`{title:动态<string>, child:组件ID}[]（至少1项）`|

### 模板片段

#### default

```json
{
  "components": [
    {"id":"t1","component":"Text","text":"肉类、蔬菜与主食分组准备。","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"tab1","component":"Column","children":["t1"],"styles":{"gap":"12vp","padding":"12vp 0vp 12vp 0vp"}},
    {"id":"t2","component":"Text","text":"先确认人数，再采购易耗食材。","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"tab2","component":"Column","children":["t2"],"styles":{"gap":"12vp","padding":"12vp 0vp 12vp 0vp"}},
    {"id":"focus","component":"Tabs","tabs":[{"title":"食材","child":"tab1"},{"title":"安排","child":"tab2"}],"styles":{"width":"100%"}}
  ]
}
```

## Modal

按需查看补充信息。

默认启用。trigger 和 content 分别引用触发节点、内容节点；核心结果仍放在主界面。打开、关闭和焦点由宿主负责，不虚构 openModal 或占位动作。

### 参数

|字段|必填|格式或枚举|
|---|---|---|
|`trigger`|是|`组件ID`|
|`content`|是|`组件ID`|

### 模板片段

#### default

```json
{
  "components": [
    {"id":"trigger","component":"Text","text":"查看用量说明","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#0A59F7","line-height":1.5,"text-align":"left","text-decoration-line":"underline","min-height":"48vp"}},
    {"id":"mh","component":"Text","text":"用量说明","variant":"h3","styles":{"font-size":"20vp","font-weight":"bold","color":"#16181D","line-height":1.3,"text-align":"left"}},
    {"id":"mt","component":"Text","text":"此页按演示数据展示配量。实际按食量和忌口调整。","variant":"body","styles":{"font-size":"16vp","font-weight":"normal","color":"#343A40","line-height":1.5,"text-align":"left"}},
    {"id":"modalbody","component":"Column","children":["mh","mt"],"styles":{"gap":"12vp","padding":"24vp 24vp 24vp 24vp"}},
    {"id":"focus","component":"Modal","trigger":"trigger","content":"modalbody"}
  ]
}
```
