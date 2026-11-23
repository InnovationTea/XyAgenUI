# 校验微服务参考接口 v1

这个内部 HTTP 入口将现有 ReplySession / NDJSONReplyStream 包装成短期会话。一次会话只写一个新建的 Surface，按完整消息校验并释放合法前缀。服务不调用模型、不渲染，也不执行消息中声明的函数。

## 本地启动

在 validator 目录中使用 Node.js 22+ 和锁定依赖运行 `npm start`。离线分发已包含依赖；源码分发先执行 `npm ci`。默认监听 `127.0.0.1:8080`，可用 `HOST`、`PORT` 指定内网地址。启动时加载一次契约环境和指纹；每次请求不会重建 Schema 环境。HTTP 适配器只启用包内默认 profile，不接受远程请求提供的 Schema、文件路径或动作执行逻辑。

## 接口

| 方法与路径 | 请求 | 成功响应 |
|---|---|---|
| GET /healthz | 无 | 200，`{status:"ok",contractSha256}` |
| POST /v1/sessions | application/json；`{surfaceId,expectedContractSha256?}` | 201，`{sessionId,contractSha256,nextSeq:1}` |
| POST /v1/sessions/{id}/chunks/{seq} | application/octet-stream，非空原始 UTF-8 字节；允许跨行、半行、跨多字节字符 | 200，`{valid:true,accepted:[{sequence,message}],acceptedCount,nextSeq}` |
| POST /v1/sessions/{id}/finish/{seq} | 空请求体；seq 使用前一次返回的 nextSeq | 200，`{valid:true,accepted:[...],acceptedCount}`；会话随即释放 |
| DELETE /v1/sessions/{id} | 空请求体 | 204；丢弃未完成尾行并释放会话 |

Agent 分配 surfaceId，使用 Skill 携带的契约指纹创建会话。服务生成不透明 sessionId。每个 HTTP 请求的 seq 与每条 A2UI 消息的 sequence 是两套独立编号，都从 1 开始。一次请求可以返回零条或多条消息。`accepted` 是本次新放行的消息，`acceptedCount` 是本会话累计计数。

Python 调用方可以将每个模型文本增量按 UTF-8 编码，或者直接转发原始字节。按 nextSeq 串行发请求，必要时把较大增量切成不超过 64 KiB 的块，字节块可切在多字节字符中间。不要逐 token 强制发一次 HTTP；可以合并当前已经取得的短增量，遇到完整行优先发送。未拿到后续内容时不应人为延迟已可交付的消息。客户端读取每个响应后，先按 sequence 将 accepted 中的 message 重新序列化为一行 JSON 加换行，交给端侧渲染队列。成功的完整尾行即使没有换行，也可能在 finish 的 accepted 中返回，必须处理。只有模型正常结束才能调用 finish；取消时调用 DELETE。

## 错误与可观察行为

- **422 内容或会话流错误**：按顺序交付响应中已经接受的前缀，再处理 diagnostics，终止本轮并保留已显示区域。坏行和之后的行不会交付。同一分片内后续出现非法 UTF-8 也不会抹掉前面的合法完整行。调用方不要在读取响应 JSON 前调用会吞掉 422 内容的 raise_for_status。结束时没有根组件也会收到 422。该会话已释放。
- **409 E_SEQUENCE**：乱序、重复或并发争用，不消费该请求，返回 expected nextSeq（字段名 nextSeq）及空 accepted。不会重放此前应答。**409 E_CONTRACT** 出现在创建会话时，说明指纹不匹配，尚未创建会话。
- **404 E_SESSION**：未知、过期、已取消或已结束的会话不自动恢复。**429 E_CAPACITY**：达到并发会话上限，未创建会话。**400/408/413/415**：请求体、读取时限、单次大小或内容类型不合法；不推进该分片的序号。
- **网络应答丢失**：没有分布式去重或持久交付收据，调用方无法用 seq 重试找回未收到的内容。停止当前 run；尽力取消会话，保留最后一次明确收到的区域。不要透明重送、补发未确认的消息或向旧 Surface 回放 create。需要跨故障恢复时另行设计幂等应答缓存与端侧 ACK。
- **接受不等于上屏**：服务返回的 sequence 只证明校验通过；端侧布局、动作执行、资源加载及 render ACK 属于宿主。

## 资源与部署边界

默认最多 32 个活跃会话、128 条并发连接。空闲 60 秒或创建满 5 分钟即失效；请求体读取限时 10 秒；单次分片 64 KiB、每个会话累计上限 4 MiB。累计上限若被本次请求超过，该分片整体不消费，返回 422 并结束会话。核心另有每条消息 256 KiB、深度 96、每会话 128 条消息和 1500 个组件的限制。过期在使用前检查，后台定期释放未访问会话。

这是可运行的单实例参考入口。重启会丢失内存会话；多副本需保证同一 session 的请求到同一实例，或另行设计共享状态和顺序控制。引用版没有内置调用方身份、租户隔离或持久状态；跨主机接入由内部网关提供鉴权、TLS 和连接限制。日志中不要写入完整用户 DSL。服务配合 Agent 与端侧接口的线上时延、背压和真机呈现需在实际环境验证。
