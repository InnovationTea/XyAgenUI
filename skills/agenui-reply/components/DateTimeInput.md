# DateTimeInput

选择日期或时间。必填 value，绑定 ISO 8601 字符串；未选时用空字符串。日期/时间能力和范围必须与实际任务一致。

状态：默认组件。

必填字段：`id`、`component`、`value`。

[字段定义](DateTimeInput.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`checks`、`component`、`value`、`enableDate`、`enableTime`、`min`、`max`、`label`。

最小组件对象（片段，不含协议消息）：

```json
{"id":"date","component":"DateTimeInput","value":{"path":"/form/date"},"enableDate":true}
```

输入初值先通过 updateDataModel 发送，类型与控件一致；控件首次绑定前路径必须存在。只初始化一次，用户修改后后续区域不得重新初始化。
