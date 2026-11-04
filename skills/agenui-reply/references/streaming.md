# 流式组织与命令

所有 `UI_PRIMARY` 回复都必须能流式渲染，默认交付 NDJSON。先设计完整组件树，再显式选择语义区域并组织成分批流。默认分批器处理一个 Surface、一条完整 updateComponents，且 root 是静态 `Column.children`；因此新 DSL 的 `root` 固定为静态 Column，复杂/动态组件放在其后代中。区域文件是二维数组，只列 root 的直接 children ID，并按其原始顺序完整分组，例如 `[["overview"],["comparison","picker"],["submit"]]`。

每个区域须可独立展示并包含完整信息，不把一个组件壳或半张卡片当作区域。首批优先输出最有用的概览/答案，让首屏已有完整内容；后续批次再追加比较、解释、输入或操作区。区域多少由内容结构决定，不设配额。

```sh
node scripts/cli.mjs validate examples/route.json
node scripts/cli.mjs stream examples/route.json --regions examples/route.regions.json --out route.ndjson
node scripts/cli.mjs stream examples/route.json --regions examples/route.regions.json --surface new --out route-new.ndjson
node scripts/cli.mjs validate route-new.ndjson --surface new --json
```

existing 默认不创建 Surface；new 先发 createSurface。初始化消息仅出现一次且先于首个组件绑定。每批补齐该区域全部递归依赖，子组件先于父组件，最后发送完整 root；root 的 children 累加，先前区域保留，root 的其他样式和属性保持完整。共享依赖只首次发送。所有完整组件都必须由 root 可达，否则分批器拒绝输出。逐批前缀必须能被宿主渲染，禁止悬空引用、重复/重排区域、空壳首批或覆盖已输入状态。

首批结束即可展示完整区域，并非仅有空壳。若确实无法使用静态 Column 根，直接编写 NDJSON 也必须遵守同一流契约：每行一条完整消息；Surface（new 时）和初值先发；组件依赖先于引用者；每个区域完整可见；每批最后发送包含全部已显示区域的完整 root；对最终 NDJSON 执行 validate。工具不自动猜测语义分组，也不负责创建 Surface 会话或投递。

宿主使用固定协议对应的官方流 API `beginTextStream` → 多次 `receiveTextChunk` → `endTextStream` 投递 NDJSON；传输块可拆分行，但接收端须缓冲到完整换行后再交给协议解析器。完整签名和异常清理见 [宿主契约](host.md)。

validate 支持 `--format auto|json|ndjson`、`--profile`、`--state`、`--surface existing|new`、`--json`。文件名 `-` 读取标准输入。诊断提供文件、消息序号（从 1 开始）、消息内部 JSON Pointer、错误码与中文说明；root 缺失等流结束错误可能没有对应的现存节点。退出码 0 成功，1 内容错误，2 配置/读取/工具错误。stream 的标准输出保持纯 NDJSON，也可用 `--out` 写文件，不覆盖输入文件。

安装：Node.js 22+，在 Skill 目录运行 `npm ci`。依赖安装后协议校验和分批均不需联网。`npm test` 执行回归；`npm run validate:examples` 检查两条完整样例、每个可见批次前缀及最终重放一致性。
