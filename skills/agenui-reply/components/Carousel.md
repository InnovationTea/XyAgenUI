# Carousel

有多张真实图片时按需轮播；content 是图片 URL 数组，不是组件引用数组。每个 URL 都必须是已确认可直接加载、无防盗链限制的 `https://` 图片直链；不要使用 `http://`、网页地址，或依赖 Referer、Cookie、登录态及临时授权参数的来源。无法确认时不要生成该图片项。

状态：默认组件。

[字段定义](Carousel.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`component`、`content`、`autoplay`、`draggable`。

