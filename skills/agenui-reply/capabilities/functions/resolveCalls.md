# resolveCalls

官方实现扩展，未列入固定 catalog，默认关闭。args.json 中嵌套 call 会被解析，path 保留；不能替代动作深解析。

类型：值函数，禁止嵌套发送动作。

参数：`json`（必填）。

[精确签名](resolveCalls.schema.json)。默认不启用，由宿主能力配置开启。
