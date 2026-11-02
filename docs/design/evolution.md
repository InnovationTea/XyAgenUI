# 演进方式

本版资源版本 1.0.0，协议固定 v0.9。修改配置前核实宿主实现，不能靠放宽 schema 让未支持能力“通过”。

- **新增运算**：先实现并确认宿主 calculateNumber 语义、边界和返回类型，复制 profile 加入 operators，增加对应声明/类型测试。默认 add、multiply 不变。
- **已有可选组件/函数**：注册 Playground 组件后加入 components；openUrl 同时加入 functions/actions；resolveCalls 仅加入 functions。校验嵌套动作隔离、输入保护与点击时行为。
- **新组件/函数**：为本地 catalog 扩展提供明确版本、来源、schema、中文说明、宿主契约和成功/失败用例；更新工具可识别列表。官方项继续从固定快照派生，不能在生成过程中临时捏造签名。
- **专用样式**：只有真实端侧依据或确认样例时才登记精确键和类型，记录来源；不开启任意 additionalProperties。未知属性持续报错。
- **协议升级**：新增版本目录或完整迁移，更新提交、原文哈希和许可；对比 schema、生命周期、替换语义及函数实现，再执行两条 P0 和新任务试用。不要覆盖旧快照而保持相同来源号。

维护命令 `node scripts/build-resources.mjs` 从固定快照重建逐项索引，`node scripts/build-examples.mjs --now <ISO> --timezone <IANA>` 重建适配样例。构建样例工具需项目原始文件；拷贝后的 Skill 运行校验与分批无需原始项目。manifest 记录生成时钟、时区及原始哈希，便于复现。

后续若支持动态根自动分批，应显式建模区域可见性、重复模板上下文和状态合并，再扩展工具，不以猜测顺序代替依赖分析。实际运行能力与生成声明始终分层。
