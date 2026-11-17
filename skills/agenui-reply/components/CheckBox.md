# CheckBox

单个布尔选择。必填 label 和 value；value 绑定 boolean 初值。

状态：默认组件。

必填字段：`id`、`component`、`label`、`value`。

[字段定义](CheckBox.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`checks`、`component`、`label`、`value`。

最小组件对象（片段，不含协议消息）：

```json
{"id":"agree","component":"CheckBox","label":"同意条款","value":{"path":"/form/agree"}}
```

输入初值先通过 updateDataModel 发送，类型与控件一致；控件首次绑定前路径必须存在。只初始化一次，用户修改后后续区域不得重新初始化。
