# 流式组织与命令

完整消息先校验，再显式选择语义区域。首版分批器仅处理一个 Surface、一条完整 updateComponents，且 root 是静态 Column.children。区域文件是二维数组，按原 children 顺序完整分组：`[["overview"],["comparison","picker"],["submit"]]`。

```sh
node scripts/cli.mjs validate examples/route.json
node scripts/cli.mjs stream examples/route.json --regions examples/route.regions.json --out route.ndjson
node scripts/cli.mjs stream examples/route.json --regions examples/route.regions.json --surface new --out route-new.ndjson
node scripts/cli.mjs validate route-new.ndjson --surface new --json
```

existing 默认不创建 Surface；new 先发 createSurface。初始化消息仅出现一次且先于组件绑定。每批补齐该区域全部递归依赖，子组件先于父组件，最后发送完整 root；root 的 children 累加，先前区域保留。共享依赖只首次发送。完整消息存在 root 不可达组件时拒绝分批，避免静默丢弃。

首批结束即可展示完整区域，并非仅有空壳。复杂根、动态布局等可直接编写 NDJSON，再执行 validate；工具不自动猜测语义分组。

validate 支持 `--format auto|json|ndjson`、`--profile`、`--state`、`--surface existing|new`、`--json`。文件名 `-` 读取标准输入。诊断提供文件、消息序号（从 1 开始）、消息内部 JSON Pointer、错误码与中文说明；root 缺失等流结束错误可能没有对应的现存节点。退出码 0 成功，1 内容错误，2 配置/读取/工具错误。stream 的标准输出保持纯 NDJSON，也可用 `--out` 写文件，不覆盖输入文件。

安装：Node.js 22+，在 Skill 目录运行 `npm ci`。依赖安装后协议校验和分批均不需联网。`npm test` 执行回归；`npm run validate:examples` 检查两条完整样例、每个可见批次前缀及最终重放一致性。
