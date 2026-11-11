# ChoicePicker

在方案中单选或多选。必填 options 和 value；value 始终绑定 string[]，单选 variant=mutuallyExclusive 时数组最多一项。每项必须有 label 和稳定 string value。

状态：默认组件。

必填字段：`id`、`component`、`options`、`value`。

[字段定义](ChoicePicker.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`checks`、`component`、`label`、`variant`、`options`、`value`、`displayStyle`、`filterable`。

最小组件对象（片段，不含协议消息）：

```json
{"id":"choice","component":"ChoicePicker","options":[{"label":"方案 A","value":"a"}],"value":{"path":"/form/choice"},"variant":"mutuallyExclusive"}
```

输入初值先通过 updateDataModel 发送，类型与控件一致；控件首次绑定前路径必须存在。只初始化一次，用户修改后后续区域不得重新初始化。
