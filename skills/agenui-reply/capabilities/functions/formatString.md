# formatString

插入数据路径或具名函数表达式；支持嵌套 ${…}，字面量起始符使用反斜线转义。

类型：值函数，只能出现在 schema 接受 DynamicValue 的位置；不得调用动作。

参数：`value`（必填）。

[精确签名](formatString.schema.json)。默认配置要求宿主注册或提供此实现。
