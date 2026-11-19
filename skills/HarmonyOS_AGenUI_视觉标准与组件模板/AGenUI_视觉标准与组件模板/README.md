# HarmonyOS × AGenUI：视觉标准与组件模板

本包提供两份核心产物：`01_视觉标准.md` 与 `02_组件模板目录.md`。

## 内容

- 基于官方来源、明确标识项目定制的字体、色彩、间距、圆角、对比度规范。
- 25种组件模板，29个附加变体；默认22种，另外3种仅在注册后启用。
- 25份完整A2UI独立例子，1份实时计算组合，1份vp与无单位字符串等价核对输入。
- 语义Token、模板元信息、Skill接入建议、离线验证程序和结果。

## 最重要的边界

1. `templates/*.json`和`visual-tokens.json`是设计资料，不是A2UI消息或官方Theme JSON；最终发送展开后的examples。
2. 用户已确认当前端侧支持 vp，尺寸无单位时默认 vp。实例按逻辑设计值输出显式 vp 字符串，`lengthScale=1/fontScale=1`；旧版2倍输出候选已撤销。尺寸字段继续使用字符串，`"16vp"`与`"16"`语义等价，不因此允许JSON数值`16`。
3. Image/Carousel的`https://example.invalid/...`只用于离线结构校验，使用前必须替换为已核验可访问的HTTPS直链；音视频、Lottie中的`res://template_*`仍需宿主提供。素材没有包含在包内。
4. Button调用的是用户当前宿主已定义的sendMsgToXiaoyi；不是AGenUI标准内置函数。
5. Chart/Markdown/Lottie默认禁用，不得只改profile而不注册真实实现。
6. 56项通过指定宿主有效Schema检查，复用其项目vp单位overlay；上游vendor原文未改。单位语义已获用户确认，真机视觉、交互和无障碍字体缩放仍未验收。
7. 设计采用HarmonyOS手机语义层级，项目端侧vp约定优先；官方AGenUI的40/36/32/28/24px来源引用保持原文，不代表官方新增vp支持。具体字体、单位和工作流差异见docs。

## 阅读顺序

视觉标准 → 组件目录 → Skill接入与验收 → 挑选templates与examples。

官方原始来源见`sources.json`；具体文档冲突和取舍见`docs/来源与差异.md`。本包不分发字体文件。
