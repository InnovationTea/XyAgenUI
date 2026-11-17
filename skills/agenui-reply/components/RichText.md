# RichText

需要少量行内富文本时使用官方支持的标签；不要混用完整网页结构。不要设置未经当前有效 RichText schema 确认的 line-clamp。

状态：默认组件。

必填字段：`id`、`component`、`text`。

[字段定义](RichText.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`component`、`text`、`variant`、`linksEnable`。

