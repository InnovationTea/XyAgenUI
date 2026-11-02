# TextField

收集文字或数字文本。value 必须绑定可写路径，官方 DynamicString 要求 string 初值，number 变体也相同；宿主负责数值文本过滤和需要的转换。

状态：默认组件。

[字段定义](TextField.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`checks`、`component`、`label`、`value`、`variant`、`validationRegexp`。

输入初值通过 updateDataModel 在首次绑定前发送。用户修改后不要重复初始化。
