# formatNumber

按 decimals、grouping 格式化数字；依赖宿主区域设置。

类型：值函数，只能出现在 schema 接受 DynamicValue 的位置；不得调用动作。

参数：`value`（必填）、`decimals`、`grouping`。

默认用法：

```json
{"call":"formatNumber","returnType":"string","args":{"value":{"call":"calculateNumber","returnType":"number","args":{"left":3,"right":{"path":"/form/count"},"operator":"add"}},"decimals":0,"grouping":false}}
```

[精确签名](formatNumber.schema.json)。默认配置要求宿主注册或提供此实现。
