# RichText

需要少量行内富文本时使用官方支持的标签；不要混用完整网页结构。内容预期会换行时，在 `styles` 显式设置 `"line-clamp": 0`（不限行），避免宿主默认截断并显示省略号；不要用正数行数省略正文。

状态：默认组件。

[字段定义](RichText.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`component`、`text`、`variant`、`linksEnable`。

