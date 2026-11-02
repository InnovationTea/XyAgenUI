# Slider

调整有范围的数值参数。value 绑定 number，明确 min/max，结果通过依赖路径与值函数联动。

状态：默认组件。

[字段定义](Slider.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`checks`、`component`、`label`、`min`、`max`、`value`。

输入初值通过 updateDataModel 在首次绑定前发送。用户修改后不要重复初始化。
