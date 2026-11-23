# 自定义函数与项目补录扩展

这些签名由本项目加入有效 Catalog。前两项由业务宿主执行；resolveCalls 是本项目补录的实现扩展，不属于此次锁定上游目录的内置列表。类型记法见[内置函数](builtin.md)。调用均需 `call`、`args`；表中粗体标明 `returnType` 必填。

## 默认启用（2）

|call|args（? 表示可选）|returnType|何时用|
|---|---|---|---|
|`calculateNumber`|`left:N`，`right:N`，`operator:add / multiply`，`decimals?:int（0…20）`，`grouping?:boolean`|`number / string` **必填**|计算数值；数值中间结果用 number，直接显示可以返回 string。|
|`sendMsgToXiaoyi`|`query:S`，可追加命名快照参数：`V`|`void`|向小艺发送消息；只作为按钮点击动作。|

## 常用联动

合计 = 3 人 × 每人克数。先给 `/form/perPerson` 初始化 number，并让 Slider 写入同一路径；将以下值绑定到 Text.text。计算返回 number，最后才格式化成 string。数字外观的 TextField 仍产生 string，不能直接接入此式。

```json
{"call":"formatNumber","returnType":"string","args":{"value":{"call":"calculateNumber","returnType":"number","args":{"left":3,"right":{"path":"/form/perPerson"},"operator":"multiply"}},"decimals":0}}
```

以下对象仅放入 `Button.action.functionCall`。保留动态声明，让宿主在点击时读取最新值；生成、校验和首屏渲染阶段均不发送消息。额外参数可提供快照，需显示在消息中的值应直接写进 query。

```json
{"call":"sendMsgToXiaoyi","returnType":"void","args":{"query":"请按每人 ${/form/perPerson} 克生成采购清单。","perPerson":{"path":"/form/perPerson"}}}
```

## 默认关闭：仅在实际宿主注册并启用后使用（1）

|call|args（? 表示可选）|returnType|何时用|
|---|---|---|---|
|`resolveCalls`|`json:任意参数值`|`any` **必填**|递归解析 json 内的值函数，保留路径声明。|

resolveCalls 不授予新函数权限，不能借它在值位置执行动作，也不能代替按钮的点击时求值。
