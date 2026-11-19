# 将独立校验器接入 Python Agent

## 角色与安装边界

把发布包中的 `agenui-reply-skill/` 交给 Agent 的 Skill 加载器。该目录只有生成规则、能力快照、视觉模板和示例；无需 Node，也不执行校验。注册时沿用 SKILL.md 中的 `name: agenui-reply`。如果你自己的加载器按文件夹名查找 Skill，可以在部署时把这一目录命名为 `agenui-reply/`。

把 `validator/` 作为另一个 Node 项目部署。它拥有实际执行的规则、进程内会话、HTTP 适配器、独立 CLI，以及维护/回归工具。服务从本地发布资源读取规则，运行时不读 Skill 文件夹。发布时导出的快照有意随两端一同交付；不要分别手改两份生成物。

## 在进入校验服务前区分输出通道

NO_UI 和 UI_PRIMARY 是模型的内部判断，不是协议操作或可见的模式标签。若模型适配器已有文本和 UI 两种内容类型，直接按类型分发，保持现有文本流式体验。若只有一个文本流，可由宿主在本轮开始时预留 surfaceId，使用内部输出通道或结构化工具事件标明 UI（由适配器移除信封）。不要把普通回复中的代码块、含有“计划”字样的文字或任意以左花括号开头的内容当成 UI。原始文本流中，一段作为示例的合法 A2UI 与相同字节的实际 UI 无法仅靠内容可靠区分；对明确索要源码、文件、Markdown 原文的请求，宿主应优先保留指定的输出方式。此包不包含对特定模型 SDK 的模式路由实现。

只对已经路由到 UI 的本轮调用下面的流程：

1. Agent 为这次回复分配唯一 surfaceId，提供给模型；模型生成原有 A2UI NDJSON。
2. Agent 读部署在自己一侧的 Skill 的 `generated/contract-stamp.json`，用其中的 contractSha256 和该 surfaceId 建立校验会话。不要从远端服务现查询哈希再原样回传，否则比对失去意义。
3. 按顺序转交模型增量，**不要等待整段回复**。网络分片与 A2UI 消息没有一一对应关系：一个分片可以含半条、完整一条或多条消息。若 SDK 给的是单个 token，可在 Agent 侧短暂合并小分片，遇到已完成的一行及时发出，避免每个 token 都往返 HTTP。
4. 把 accepted 数组里的 message 原样送进本轮渲染队列，保持 sequence 顺序。即使服务返回 422，也先处理同一响应里已通过的前缀，再进入失败状态。校验成功和端侧已渲染是两个不同的事件。
5. 正常结束调用 finish。用户取消、上游断连或校验失败时停止生成，不把不完整尾部冒充正常结束。HTTP 返回结果未知时不自动重传；保留已展示区域并结束本次会话。端侧负责真正的输入、公式重算和按钮动作。

## 使用附带的异步适配示例

`integrations/python_agent.py` 使用 Python 标准库，不需要给 Agent 安装 JavaScript 依赖。每次消费网络返回的完整分片后就能转交合法消息。举例（Python 3.10+）：

```python
import json
from contextlib import aclosing
from pathlib import Path
from python_agent import AgentValidator

async def deliver_reply(model_deltas, render_queue, surface_id, skill_dir):
    # model_deltas 是异步的 str/bytes 增量序列；由现有模型 SDK 提供。
    stamp = json.loads((Path(skill_dir) / "generated/contract-stamp.json").read_text("utf-8"))
    validator = AgentValidator("http://127.0.0.1:8080")
    async with aclosing(validator.validate_stream(
        model_deltas, surface_id=surface_id,
        expected_contract_sha256=stamp["contractSha256"],
    )) as accepted:
        async for message in accepted:
            # 若现有端侧接收文本块，这里转为一行 A2UI；不要发送 HTTP 的包装字段。
            await render_queue.put(json.dumps(message, ensure_ascii=False) + "\n")
```

在调用者的异常/取消处理里取消模型 SDK 的本次生成并关闭输出流。示例的失败行为是保留已验证前缀、清理服务会话、向调用者抛错；没有自动修复、自动重试或实际下发动作。示例为便于独立使用而每个请求打开一个连接；流量增加后，可在保持序号与前缀处理规则的前提下复用 HTTP 连接池。

## 本地完整回放

从 `validator/` 目录运行。已带依赖的离线版可直接启动；源码版先用锁文件执行 `npm ci`：

```sh
npm start
```

在第二个终端，同样从 `validator/` 运行（假设使用联调包的并列目录布局）：

```sh
python3 integrations/python_agent.py \
  ../agenui-reply-skill/references/examples/portion-planner.ndjson \
  --surface-id portion-planner \
  --stamp ../agenui-reply-skill/generated/contract-stamp.json
```

命令将已通过校验的完整 A2UI 消息逐行输出到 stdout，错误写入 stderr。这里从旁边的 Skill 读取的是**联调客户端的示例输入**；校验服务启动、处理请求和执行自身测试均不依赖这个路径。若两者部署在不同机器上，Agent 只需持有自己的 Skill 和服务地址。

## 上线边界

当前 HTTP 入口用于内网穿刺，默认仅监听本机。进程内临时会话使单轮请求必须命中同一实例；进程重启会丢失在途会话。若引入多个副本，需在入口按会话定向，或另行实现可恢复状态；不能只在前面加无状态轮询。正式跨机器部署前应落实调用方身份、加密通道、限流、观测与容量压测。协议细节、上限与状态码以 [SERVICE.md](SERVICE.md) 和 `scripts/service.mjs` 为准。
