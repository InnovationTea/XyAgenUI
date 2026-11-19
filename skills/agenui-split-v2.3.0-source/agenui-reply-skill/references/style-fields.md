# 样式字段速查

仅在选定模板需要微调时查本页。尺寸和颜色如何选见[视觉规则](visual.md)；组件自己的扩展样式见对应[组件章节](components/index.md)。本表映射当前有效 Catalog 的字段，生成时仍须遵守组件自身的附加条件。

## 通用 styles

|字段|取值|
|---|---|
|`width`、`height`、`flex-basis`|字符串：非负长度 / 百分比 / auto|
|`min-width`、`max-width`、`min-height`、`max-height`、`top`、`right`、`bottom`、`left`、`inset-inline-start`、`inset-inline-end`、`inset-block-start`、`inset-block-end`|字符串：非负长度 / 百分比|
|`margin`|字符串：1–4 个非负长度 / auto|
|`margin-top`、`margin-right`、`margin-bottom`、`margin-left`|字符串：非负长度 / auto|
|`padding`|字符串：1–4 个非负长度|
|`padding-top`、`padding-right`、`padding-bottom`、`padding-left`、`gap`、`border-radius`、`border-width`、`margin-block-start`、`margin-block-end`、`margin-inline-start`、`margin-inline-end`、`padding-block-start`、`padding-block-end`、`padding-inline-start`、`padding-inline-end`|字符串：非负长度|
|`display`|flex / none|
|`visibility`|visible / hidden|
|`opacity`|数字 ≥ 0 且 ≤ 1|
|`overflow`|hidden / visible / scroll|
|`flex-direction`|row / row-reverse / column / column-reverse|
|`flex-wrap`|nowrap / wrap / wrap-reverse|
|`justify-content`|flex-start / flex-end / center / space-between / space-around / space-evenly|
|`align-items`|flex-start / flex-end / center / stretch / baseline|
|`align-self`|auto / flex-start / flex-end / center / stretch / baseline|
|`align-content`|flex-start / flex-end / center / space-between / space-around / stretch|
|`flex-grow`、`flex-shrink`|数字 ≥ 0|
|`position`|relative / absolute|
|`aspect-ratio`|数字或宽/高的字符串，如 "1.5" 或 "16/9"|
|`background-color`|#RRGGBB / #RRGGBBAA、rgb()/rgba()，或 Catalog 允许的 linear/radial/conic-gradient()|
|`background-image`|url(...)；项目要求已知、无凭据的 HTTPS 字面量地址|
|`border-color`|颜色字符串：#RRGGBB / #RRGGBBAA 或 rgb()/rgba()|
|`border-style`|solid|
|`filter`|drop-shadow(...)；不扩展为其他 CSS filter|

## Text 独有的 styles

|字段|取值|
|---|---|
|`color`、`text-decoration-color`|颜色字符串：#RRGGBB / #RRGGBBAA 或 rgb()/rgba()|
|`font-size`、`text-decoration-thickness`|字符串：非负长度|
|`line-clamp`|整数 ≥ 1|
|`text-align`|left top / left / left center / left bottom / center top / center / center center / center bottom / right top / right / right center / right bottom|
|`font-family`|字体族字符串，如 system；不要指定未确认安装的字体|
|`font-weight`|normal / medium / bold；或 100～900 的整百数（也可用整数字符串）|
|`line-height`|非负 number 是字号倍率；绝对高度用长度字符串|
|`text-overflow`|clip / head / middle / ellipsis|
|`text-decoration`|underline / line-through / none，可按顺序加线型和颜色|
|`text-decoration-line`|none / underline / line-through|
|`text-decoration-style`|solid / dashed / dotted / double / wavy|

完整文字省略 line-clamp。RichText、Markdown 与输入控件不要照搬 Text 专属字段。
