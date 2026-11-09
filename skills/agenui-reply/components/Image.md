# Image

有真实图片来源且对任务有帮助时使用；不编造图片链接。每个 `Image` 必须在 `styles.width` 显式设置大于 0 的宽度，例如容器内自适应使用 `"100%"`，定宽缩略图使用适合布局的 `px` 值；不能依赖 `variant` 产生宽度。图片 URL 必须是已确认可直接加载的 `https://` 直链，不能用 `http://`、网页地址或有防盗链限制的域名；不得依赖 Referer、Cookie、登录态或临时授权参数。无法确认来源满足这些要求时，不生成该 `Image`，改用纯色或其他有依据的内容。

状态：默认组件。

[字段定义](Image.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`component`、`url`、`description`、`fit`、`variant`。

