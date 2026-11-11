# 协议与样例差异

来源固定到 AGenUI/AGenUI 提交 `5c347a8352c1afff31879bcf5af4101df4f94137`，本地 catalog 原文哈希记录于 `vendor/SOURCE.json`，Apache-2.0 许可随包保留。A2UI v0.9 与通用 A2UI 其他版本或其他 catalog 不可混用。

| 差异 | 本版处理 | 依据与边界 |
|---|---|---|
| PRD 和早期方案的函数拼写与原例不同 | 以原例 calculateNumber、sendMsgToXiaoyi 为准，适配时不重命名 | 两份原始样例及用户最新要求；不自动接受别名 |
| 历史原例只有 updateComponents | 初始化控件数据；新生成的在线流和 CLI 默认要求先 createSurface | 原始源树可由维护工具按显式区域转换，复用已有 Surface 需明确选择 existing |
| 互斥选择的 value 也须数组 | route 使用 string[] | 固定 catalog 的 DynamicStringList；宿主写回须集成验证 |
| 原 catalog TextStyles 封闭继承与自身字体属性冲突 | 有效 schema 展平 TextStyles，并移除 Text 重复的通用 ComponentCommon；保留文本专用 common | 只修复该继承边界，不放宽其他组件样式 |
| 原 catalog 将非正 line-clamp 描述为不限行 | 当前 Text 生成与校验禁止非正数；长描述摘要使用 3，短文本和完整内容省略 | 保留原始快照；摘要不得承载唯一关键信息 |
| 样例端侧专用样式不在 catalog | 有来源记录的 style-compatibility.json 精确开启键和类型 | ChoicePicker 6 个键、DateTimeInput.compact 的 5 个键，未知键仍拒绝 |
| Markdown、Chart、Lottie 出现在 catalog | 默认 profile 排除；注册后按配置加入 | 属 Playground 示例扩展，不计入 22 个 SDK 组件 |
| catalog 函数清单含 openUrl | 14 个已有实现值函数默认；openUrl 默认关闭 | catalog 声明不等于宿主注册 |
| resolveCalls 在 core 有实现但不在 catalog | 单独 schema、默认关闭 | 不能替代 Button.action 深解析，不能嵌套动作 |
| 组件重复 ID 更新 | 完整替换 | 不做属性合并，分批 root 保留完整属性与历史 children |

每个官方组件/函数 schema 包装文件引用原始定义；自定义 schema 作为片段注入同一 catalog 后解析 `#/$defs`。独立验证必须使用本工具加载完整能力环境，不能把未加载依赖的签名片段直接当成完整 schema。

样式兼容关闭后火锅例会因专用键报错，这是配置能力收窄的预期行为。通用排版修复不受兼容开关影响。原始样例文件保持字节不变，examples/manifest.json 记录其 SHA-256；生成器仅增加初值，不修改函数名称、重排或重设计样例组件。

模板允许直接出现在普通动态字符串中，支持具名参数、嵌套调用、路径、数组与转义。解析器检查声明而不计算数值。工具能发现语法截断、缺 root、悬空引用；若流在完整语义区域后被提前结束且语法完整，仅凭协议无法判断是否还应有后续业务区域。
