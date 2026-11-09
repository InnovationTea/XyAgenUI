# 组件索引

默认 22 个 SDK 组件；3 个 Playground 示例扩展关闭。只读取本次任务需要的组件说明和 schema。通用样式与类型见 [官方快照](../vendor/agenui_catalog.json)。

| 组件 | 支持 | 用途 |
|---|---|---|
| [Text](Text.md) | 默认 | 短标题、正文、指标与提示 |
| [Image](Image.md) | 默认 | 使用已验证 HTTPS 直链并显式设置非零宽度；不编造图片链接 |
| [Icon](Icon.md) | 默认 | 使用 schema 中已支持的图标名，辅助识别；不要让图标取代必要的文字说明 |
| [Video](Video.md) | 默认 | 用户确需查看视频且已有真实资源时使用 |
| [AudioPlayer](AudioPlayer.md) | 默认 | 已有可用音频且任务需要收听时使用 |
| [Row](Row.md) | 默认 | 少量横向信息或左右对齐指标 |
| [Column](Column.md) | 默认 | 纵向分区及根布局 |
| [List](List.md) | 默认 | 重复条目及列表 |
| [Card](Card.md) | 默认 | 完整语义区域的圆角卡片，图片背景上使用半透明浅色底与深色文字；单一 child 引用内容容器，避免重复嵌套视觉外壳 |
| [Tabs](Tabs.md) | 默认 | 同一任务的互斥信息视角；tabs[].child 引用对应内容，不在字段中内嵌组件对象 |
| [Modal](Modal.md) | 默认 | 需要暂时展开的附加信息；trigger 和 content 均为组件 ID |
| [Divider](Divider.md) | 默认 | 必要时区分卡片内部信息组，避免每行都加分隔线 |
| [Button](Button.md) | 默认 | 必须有可见标签和已声明接收方 |
| [TextField](TextField.md) | 默认 | 收集文字或数字文本 |
| [CheckBox](CheckBox.md) | 默认 | 单个布尔选择；value 绑定 boolean 初值 |
| [ChoicePicker](ChoicePicker.md) | 默认 | 在方案中单选或多选 |
| [Slider](Slider.md) | 默认 | 调整有范围的数值参数 |
| [DateTimeInput](DateTimeInput.md) | 默认 | 选择日期或时间；value 绑定 ISO 8601 字符串，未选时为空字符串 |
| [RichText](RichText.md) | 默认 | 需要少量行内富文本时使用官方支持的标签；不要混用完整网页结构 |
| [Lottie](Lottie.md) | 扩展 | Playground 示例扩展，默认关闭；仅在动画有助任务时启用 |
| [Table](Table.md) | 默认 | 多选项同维度比较 |
| [Web](Web.md) | 默认 | 任务确需嵌入网页且宿主支持时使用；不要用 Web 绕过组件和能力约束 |
| [Markdown](Markdown.md) | 扩展 | Playground 示例扩展，默认关闭；宿主注册并开启配置后可使用 |
| [Carousel](Carousel.md) | 默认 | 有多张真实图片时按需轮播；content 是已验证 HTTPS 图片 URL 数组，不是组件引用数组 |
| [Chart](Chart.md) | 扩展 | Playground 示例扩展，默认关闭；先确认原生图表组件已注册 |
