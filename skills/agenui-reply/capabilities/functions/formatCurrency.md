# formatCurrency

按 ISO 4217 货币代码格式化金额。

类型：值函数，只能出现在 schema 接受 DynamicValue 的位置；不得调用动作。

参数：`value`（必填）、`currency`（必填）、`decimals`、`grouping`。

[精确签名](formatCurrency.schema.json)。默认配置要求宿主注册或提供此实现。
