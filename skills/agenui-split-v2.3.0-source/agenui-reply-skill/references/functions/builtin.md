# 官方内置函数

“内置”按本项目锁定的高德 AGenUI Catalog 判断；可用性以本轮 profile 为准。表中均须写 `call`、`args`；`returnType` 未标必填时可省略，嵌套与动态属性建议显式写出对应类型。

S/N/B 是动态字符串/数值/布尔：同类型常量、已初始化的 path 或返回对应类型的值函数。V 是动态值（字符串、数值、布尔、数组、path 或已启用的值函数）。小写类型和枚举按字面传入。

## 默认启用（14）

|call|args（? 表示可选）|returnType|何时用|
|---|---|---|---|
|`required`|`value:任意参数值`|`boolean`|必填检查：值不为空。|
|`regex`|`value:S`，`pattern:string`|`boolean`|字符串是否匹配给定模式。|
|`length`|`value:S`，`min?:int≥0`，`max?:int≥0`，min/max 至少一项|`boolean`|检查字符串长度。|
|`numeric`|`value:N`，`min?:number`，`max?:number`，min/max 至少一项|`boolean`|检查数值范围，不负责转换文本。|
|`email`|`value:S`|`boolean`|检查邮箱格式。|
|`and`|`values:B[]（≥2项）`|`boolean`|全部条件同时成立。|
|`or`|`values:B[]（≥2项）`|`boolean`|至少一个条件成立。|
|`not`|`value:B`|`boolean`|布尔取反。|
|`formatString`|`value:S`|`string`|按已初始化的路径或具名值函数插入文案。|
|`formatNumber`|`value:N`，`decimals?:N`，`grouping?:B`|`string`|把数值格式化为显示文本；可设小数位和分组。|
|`formatCurrency`|`value:N`，`currency:S`，`decimals?:N`，`grouping?:B`|`string`|把以货币主单位表示的金额格式化；currency 用 ISO 4217 代码，如 CNY；不做汇率或分/元换算。|
|`formatDate`|`value:V`，`format:S`|`string`|按 Unicode TR35 格式化日期；如 yyyy-MM-dd HH:mm。|
|`pluralize`|`value:N`，`zero?:S`，`one?:S`，`two?:S`，`few?:S`，`many?:S`，`other:S`|`string`|按语言的复数类别选文案；other 为兜底。|
|`token`|`name:S`|`string`|解析宿主已加载的主题 Token；不能假定项目视觉表中的任意键已被宿主注册。|

## 两种常见写法

输入框 `checks[].condition` 的布尔条件。先将 `/form/email` 初始化为字符串；checks 中的 message 另写提示文案。

```json
{"call":"and","returnType":"boolean","args":{"values":[{"call":"required","returnType":"boolean","args":{"value":{"path":"/form/email"}}},{"call":"email","returnType":"boolean","args":{"value":{"path":"/form/email"}}}]}}
```

金额展示：`/plan/amount` 已初始化为以元为单位的 number。将此对象放在 `Text.text`；显示结果是 string，不再用于计算。

```json
{"call":"formatCurrency","returnType":"string","args":{"value":{"path":"/plan/amount"},"currency":"CNY","decimals":2}}
```

普通路径插值仅用于已支持的字段；`formatString` 内可用 `${/form/name}`，函数形式必须是具名参数。任意 JavaScript、算术中缀表达式和未声明的函数不能使用。

## 默认关闭：仅在实际宿主注册并启用后使用（1）

|call|args（? 表示可选）|returnType|何时用|
|---|---|---|---|
|`openUrl`|`url:URI字符串`|`void`|通过宿主打开 URI；仅用于动作位置，需启用并注册接收方。|

动作只放在 `Button.action.functionCall`；默认没有已启用的打开链接动作。
