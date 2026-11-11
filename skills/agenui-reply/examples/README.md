# 示例索引

- `golden/`：当前协议和视觉规则下的完整在线消息流，已由本地校验器检查。
- `snippets/`：单一结构或交互机制的最小正例。
- `negative/`：故意无效的输入及 `expected.json` 中记录的预期诊断。
- `legacy/`：历史迁移样例及其来源记录；仅供理解旧内容，不作为当前生成规范。

在线示例一律使用一行一条完整消息的 NDJSON。多区域必须按顺序追加完整区域和完整 `root`。初值只在首次绑定前发送；已展示的输入不能再次初始化。

常用片段：`minimal-card.ndjson` 展示卡片骨架；`slider-result.ndjson` 展示滑块和数字计算；`choice-action.ndjson` 展示选项状态与点击时读取路径；`text-field-number.ndjson` 展示数字外观仍绑定字符串；`dynamic-list.ndjson` 展示列表相对路径模板。
