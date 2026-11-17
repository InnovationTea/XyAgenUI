# pluralize

按 CLDR 数量分类选择文案，必须提供 other。

类型：值函数，只能出现在 schema 接受 DynamicValue 的位置；不得调用动作。

参数：`value`（必填）、`zero`、`one`、`two`、`few`、`many`、`other`（必填）。

[精确签名](pluralize.schema.json)。默认配置要求宿主注册或提供此实现。
