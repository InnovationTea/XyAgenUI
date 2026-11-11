# 能力清单 1.0.0

协议固定为 A2UI v0.9，官方提交及许可见 [来源](../vendor/SOURCE.json)。组件字段见 [索引](../components/index.md)。默认能力是宿主必须兑现的契约，不代表任意官方平台已自动注册全部函数。

| 类别 | 默认启用 | 条件启用 |
|---|---|---|
| 组件 | 22 个 SDK 组件 | Markdown、Chart、Lottie：宿主注册后加入 components |
| 官方值函数 | required、regex、length、numeric、email、formatString、formatNumber、formatCurrency、formatDate、pluralize、token、and、or、not | — |
| 自定义值函数 | calculateNumber（add、multiply） | 新运算需实现、签名及测试后加入 operators |
| 动作 | sendMsgToXiaoyi | openUrl：同时加入 functions 和 actions |
| 实现扩展 | — | resolveCalls：加入 functions，保持动作隔离 |
| 事件 | 无 | 接收方存在后在 events 中登记名称 |

生成前读[函数生成契约](../references/function-contracts.md)及当前任务实际使用到的函数 `.md` / `.schema.json`。每个函数在 `functions/` 下分别维护说明与签名；官方 schema 包装文件引用原始 catalog。调用位置、参数类型与返回类型以有效 Schema 为准，说明和样例不得扩展函数签名。

复制 [default.json](profiles/default.json) 为项目 profile，传入 `--profile <路径>`。`version`、`protocolVersion` 必须保持当前版本；`catalogId` 必须与宿主实际注册值一致。`styleCompatibility` 仅开启 [有来源的样式键](style-compatibility.json)，可关闭以检查严格官方字段。未知键始终拒绝。新增组件/函数先增加本地 schema 和实现契约再升级工具；配置不能凭空定义未实现能力。
