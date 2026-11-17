# Slider

调整有范围的数值参数。必填 max 和 number 类型 value；显式给出合理 min/max，value 的初值必须落在范围内。不要添加 schema 未声明的 step。

状态：默认组件。

必填字段：`id`、`component`、`value`、`max`。

[字段定义](Slider.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`checks`、`component`、`label`、`min`、`max`、`value`。

最小组件对象（片段，不含协议消息）：

```json
{"id":"count","component":"Slider","min":1,"max":10,"value":{"path":"/form/count"}}
```

输入初值先通过 updateDataModel 发送，类型与控件一致；控件首次绑定前路径必须存在。只初始化一次，用户修改后后续区域不得重新初始化。
