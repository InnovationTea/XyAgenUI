# calculateNumber

宿主自定义值函数。left/right 支持数值、路径或嵌套计算；默认仅 add、multiply。返回中间数值时用 number，显示时可用 string。

类型：值函数，只能出现在 schema 接受 DynamicValue 的位置；不得调用动作。

参数：`left`（必填）、`right`（必填）、`operator`（必填）、`decimals`、`grouping`。

默认用法：

```json
{"call":"calculateNumber","returnType":"number","args":{"left":3,"right":{"path":"/form/count"},"operator":"add"}}
```

[精确签名](calculateNumber.schema.json)。默认配置要求宿主注册或提供此实现。
