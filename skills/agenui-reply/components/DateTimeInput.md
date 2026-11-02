# DateTimeInput

选择日期或时间；value 绑定 ISO 8601 字符串，未选时为空字符串。默认时间要写入数据模型。

状态：默认组件。

[字段定义](DateTimeInput.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`checks`、`component`、`value`、`enableDate`、`enableTime`、`min`、`max`、`label`。

输入初值通过 updateDataModel 在首次绑定前发送。用户修改后不要重复初始化。
