# 组件索引

点击组件名直达分册中的对应章节，只读本批需要的参数与模板。前五组默认可用；宿主扩展须先注册并启用。

## 布局与分组

|组件|何时使用|
|---|---|
|[Column](layout.md#column)|纵排与根布局|
|[Row](layout.md#row)|并排短字段或操作|
|[Card](layout.md#card)|分隔完整任务区|
|[Divider](layout.md#divider)|区分相邻分组|

## 文字、图标与表格

|组件|何时使用|
|---|---|
|[Text](content.md#text)|标题、正文与动态指标|
|[RichText](content.md#richtext)|短 HTML 富文本|
|[Icon](content.md#icon)|辅助识别|
|[Table](content.md#table)|少列同维度对比|

## 输入与操作

|组件|何时使用|
|---|---|
|[TextField](inputs.md#textfield)|输入自由文本或数字草稿|
|[Slider](inputs.md#slider)|调节连续数值|
|[CheckBox](inputs.md#checkbox)|记录独立布尔状态|
|[ChoicePicker](inputs.md#choicepicker)|在有限选项中单选或多选|
|[DateTimeInput](inputs.md#datetimeinput)|选择有业务用途的日期或时间|
|[Button](inputs.md#button)|提交或触发确有接收方的动作|

## 列表、页签与弹层

|组件|何时使用|
|---|---|
|[List](navigation.md#list)|重复条目与采购勾选|
|[Tabs](navigation.md#tabs)|切换同一任务的视角|
|[Modal](navigation.md#modal)|按需查看补充信息|

## 图片、媒体与网页

|组件|何时使用|
|---|---|
|[Image](media.md#image)|封面、缩略图与头像|
|[Carousel](media.md#carousel)|浏览多张图片|
|[Video](media.md#video)|展示已有操作视频|
|[AudioPlayer](media.md#audioplayer)|播放已有语音说明|
|[Web](media.md#web)|嵌入一个已知网页|

## 宿主扩展

|组件|何时使用|
|---|---|
|[Chart](extensions.md#chart)|观察趋势、分布或占比|
|[Markdown](extensions.md#markdown)|呈现较长的结构化说明|
|[Lottie](extensions.md#lottie)|非必要的轻量动效|

## 共同字段和模板读法

- 每个节点必填 `id:string` 和 `component`（本节组件名）；可选 `styles` 样式对象；`accessibility` 对象中的 `label` 和 `description` 均为可选动态字符串。作为 Row/Column 直接子项时可选 `weight:number`。通用样式见[样式字段](../style-fields.md)；各组件的参数表只列专有字段。
- `动态<T>` 表示类型为 T 的常量、`{path}` 或返回相应类型的已启用值函数。可编辑控件的 value 用已初始化的可写路径。`检查规则` 是 `{condition:动态<boolean>,message:string}`；只在列出 checks 的组件使用。嵌套参数中 `?` 表示可省略。
- 同一标题中的变体名共用完全相同的片段；其余变体均已展开，不做补丁合并。若有 initialData，把相应初值在**绑定前**用 updateDataModel 初始化；后批只写新增路径。把 components 内的节点加入本批 updateComponents，依赖已排在当前节点前；把示例 ID、引用、路径、文案和业务数据改成当前任务的值，并从本轮根节点挂接。不要输出变体名、initialData 或模板外壳。
- 同名模板 default 不表示 DSL 的 variant 字段也叫 default。按所选模板里的实际字段生成。
