# Image

有真实图片来源且对任务有帮助时使用。每个 Image 都要在 styles.width 显式设置大于 0 的宽度。URL 必须是确认可直接加载的 https:// 直链，不得使用 http://、网页地址或有防盗链限制的来源；无法确认时改用纯色或其他有依据的内容。

状态：默认组件。

必填字段：`id`、`component`、`url`。

[字段定义](Image.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`component`、`url`、`description`、`fit`、`variant`。

