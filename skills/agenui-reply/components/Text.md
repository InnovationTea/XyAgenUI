# Text

短标题、正文、指标与提示。用 variant 和黑灰层级组织信息；动态结果绑定路径或值函数。内容预期会换行时，在 styles 设置 line-clamp: 0；不要省略正文。

状态：默认组件。

必填字段：`id`、`component`、`text`。

[字段定义](Text.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`component`、`text`、`variant`。

最小组件对象（片段，不含协议消息）：

```json
{"id":"title","component":"Text","text":"标题"}
```

