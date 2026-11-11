# Button

必须有可见标签和已声明接收方。action.functionCall 使用动作函数；首次渲染前注册 action 深解析。

状态：默认组件。

必填字段：`id`、`component`、`child`、`action`。

[字段定义](Button.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。

可用字段：`id`、`styles`、`accessibility`、`weight`、`checks`、`component`、`child`、`variant`、`action`。

最小组件对象（片段，不含协议消息）：

```json
{"id":"submit","component":"Button","child":"submit_label","action":{"functionCall":{"call":"sendMsgToXiaoyi","args":{"query":"继续"}}}}
```

