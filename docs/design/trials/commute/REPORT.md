# 独立 Skill 试用：通勤电动自行车

维护说明：本试用产物的发送函数已按两份原始样例同步为 sendMsgToXiaoyi，并重新通过校验与分批重放；以下保留独立试用时的过程记录。

输入为三款车的已知价格、续航与特点，需要比较、选择、填写每日往返公里数并回传继续评估。未读取路线/火锅样例，依 Skill 入口与按需组件/函数/协议资源完成。

- 完整消息：commute.json（18 个组件）
- 区域配置：regions.json（概览、比较、需求表单、继续评估，共 4 区）
- 新建 Surface 流：commute.ndjson（6 条消息）
- 自动证据：verification.json

两次 validate（完整 JSON 和 new 模式 NDJSON）均退出 0、valid:true、diagnostics:[]；stream 退出 0。4 个可见区域前缀均合法，首批含完整标题、条件建议及事实限制说明；最终组件图与数据模型和完整版本一致，初始化只发送 1 次。

采用紧凑密度：浅灰背景、12px 白卡、16px 内边距、8–12px 间距、黑灰文字，深绿主按钮。比较表包含用户给出的全部三款车信息；单选 string[] 初值 []，数字文本里程 string 初值空串，不捏造用户通勤距离。按钮声明 required/regex checks；query 模板、bike 和 dailyRoundTripKm 均保留路径动态读取。未执行函数或发送消息。

实际说明问题：components/TextField.md 将 number 变体写回类型描述为依宿主契约，而 references/protocol.md 明确 string；建议同步为“官方 DynamicString，初值/写回 string；若宿主另有扩展需先定义兼容契约”。此问题未阻止试用，因为协议页给出了明确规则。其余未发现阻塞性使用问题。

限制：只做声明、依赖与分批重放检查，不能证明真实组件渲染、checks 对按钮的交互效果、点击求值或消息回传。
