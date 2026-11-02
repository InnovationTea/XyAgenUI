# ChoicePicker

在方案中单选或多选。value 始终绑定 string[]，mutuallyExclusive 最多一项；显示标签与稳定 value 分开。

状态：默认组件。

[字段定义](ChoicePicker.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`checks`、`component`、`label`、`variant`、`options`、`value`、`displayStyle`、`filterable`。

输入初值通过 updateDataModel 在首次绑定前发送。用户修改后不要重复初始化。
