# length

校验字符串长度，min/max 至少提供一个。

类型：值函数，只能出现在 schema 接受 DynamicValue 的位置；不得调用动作。

参数：`value`（必填）、`min`、`max`。

[精确签名](length.schema.json)。默认配置要求宿主注册或提供此实现。
