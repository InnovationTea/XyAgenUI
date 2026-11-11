# TextField

收集文字或数字文本。必填 label；value 如需编辑必须绑定可写路径。其类型始终是 string，number 外观也用 string 初值，由宿主负责数值文本过滤和转换。variant 仅允许 shortText、longText、number、obscured。

状态：默认组件。

必填字段：`id`、`component`、`label`。

[字段定义](TextField.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`checks`、`component`、`label`、`value`、`variant`、`validationRegexp`。

最小组件对象（片段，不含协议消息）：

```json
{"id":"name","component":"TextField","label":"姓名","value":{"path":"/form/name"}}
```

输入初值先通过 updateDataModel 发送，类型与控件一致；控件首次绑定前路径必须存在。只初始化一次，用户修改后后续区域不得重新初始化。
