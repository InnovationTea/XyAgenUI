# 已有宿主接入与验收

完整契约随 Skill 独立打包于 [references/host.md](../../skills/agenui-reply/references/host.md)，本文件记录集成步骤与验收边界。

1. 确认 SDK 与 catalog 固定版本；向生成端提供实际 profile、Surface 模式、当前保留状态、时区及可用数据。
2. 在首次渲染前注册所有启用组件和函数，并执行 `AGenUI.registerDeepParseProperty('Button', 'action')`。custom calculateNumber 兑现数值/字符串返回契约，sendMsgToXiaoyi 兑现 query 和快照接收。
3. 按官方 beginTextStream → receiveTextChunk → endTextStream 会话投递 NDJSON，异常与取消也清理会话。existing 使用已存在的同名 Surface；new 通过 createSurface 创建，防止重复创建。
4. 响应输入路径变化，点击时解析完整 action 参数与事件 context。展示状态只初始化一次，保留用户已修改值；发送前做业务校验。
5. 向用户反馈发送中/成功/失败，防止重复提交；多轮沿用 Surface 与模型，明确何时重置与释放。

| 集成项目 | 通过标准 |
|---|---|
| 路线选择 | 切换三条路线后，提交携带当前 string[]，继续细化动作到达接收方 |
| 双滑块 | 调整任一值，人数与肉量的嵌套结果同步，显示格式正确 |
| 多选与日期 | 数组写回与 ISO 日期符合契约，默认时间依据用户时区 |
| 点击快照 | 点击瞬间 query、单独参数、嵌套结果读取同一最新状态 |
| 流式 | 首个区域完整出现，后续区域追加，先前输入没有回跳 |
| 异常与多轮 | 发送失败可理解、取消不残留会话、下一轮保留约定状态 |

本仓库自动验收只证明协议、能力、引用、类型与重放一致性；不声称已经在设备上运行，也不模拟业务发送成功。本次不实现客户端或浏览器验证台。
