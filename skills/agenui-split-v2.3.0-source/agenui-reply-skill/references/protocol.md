# 协议与流式规则

本 Skill 使用当前宿主的 A2UI v0.9；允许的组件、函数、动作与运算符见[能力快照](host-profile.json)。本轮只写一个新回复，不修改旧回复。

## 怎样发一批

每行一个完整 JSON 对象，以 LF 结尾：`version:"v0.9"` 加一个操作。键和值中的字符串用双引号，字符串内换行写 `\n`；不使用重复键、注释、尾随逗号、顶层数组或代码围栏。模型 token 和网络分片都不是消息边界。

| 操作 | 在本轮的用法 |
|---|---|
| `createSurface` | 新回复先建面一次；所有消息用同一个宿主分配的 `surfaceId`。仅在宿主明确预建本轮 Surface 时省略。`reply` 仅适用于宿主已隔离该回复的容器。`catalogId` 使用快照中的宿主别名，不据此推断额外能力。 |
| `updateDataModel` | 在引用数据前用 `path`、`value` 初始化正确类型；没有绑定就无需此消息。写入会替换该路径的值，不做对象深合并。 |
| `updateComponents` | `components` 中先定义子节点再定义父节点，最后放非空静态 Column `root`。本批结束时所有引用已定义、从根可达，无循环或重复 ID。 |
| `deleteSurface` | 普通回复不发送；生命周期由宿主管理。结束也不另发标记。 |

同轮追加时，唯一可重发的节点是完整 `root`。保留其全部非 `children` 属性和原有子 ID 顺序，只在末尾追加新区域。后批可初始化新路径；不能写回已展示输入、其父路径或子路径，也不要替换或重排含可编辑项的列表。已显示的控件仍可由用户本地操作。

## 引用、绑定与动作

- **组件引用用 ID，数据绑定用 path。** 例如 `"child":"label"` 引用节点；`"value":{"path":"/form/done"}` 绑定数据。选择单个子节点还是数组、列表模板的具体字段，查对应组件章节。
- 普通绑定用绝对路径；本项目数据根为 `/`，字段名中的 `/`、`~` 分别写 `~1`、`~0`。动态列表项内用相对路径如 `name`、`detail/title`，不能为每一项都绑定 `/items/0/name`。
- 只在支持的动态字段使用常量、路径或匹配返回类型的值函数。输入控件的 `value` 必须绑定**可写路径**，按对应组件章节给出的类型初始化。计算中间值保持数值，展示时才格式化。仅在已证实支持的字段使用字符串插值；复杂计算用结构化函数，不塞入任意表达式。
- 人数等输入必须是整数时，不把连续 Slider 显示为零位小数就当成整数输入。若选项有限且已知，可用 Tabs 切换“3 人 / 4 人 / 5 人”等预先算好的完整方案，明确覆盖哪些人数；不要把 ChoicePicker 的选择数组直接传给数值计算。
- 动作只放在 `action.functionCall`，按宿主注册的签名声明；需要最新输入时保留动态绑定，由宿主在点击时读取。生成阶段不执行动作，也不为没有接收方的事件造名称。

## 一份可直接回放的最小流

此例展示复选项先可用、提示随后追加；为突出消息顺序，省略可选样式。`party-list` 仅是此例的 Surface ID。

```ndjson
{"version":"v0.9","createSurface":{"surfaceId":"party-list","catalogId":"https://a2ui.org/specification/v0_9/standard_catalog.json"}}
{"version":"v0.9","updateDataModel":{"surfaceId":"party-list","path":"/form/baseBought","value":false}}
{"version":"v0.9","updateComponents":{"surfaceId":"party-list","components":[{"id":"base","component":"CheckBox","label":"锅底已采购","value":{"path":"/form/baseBought"}},{"id":"root","component":"Column","children":["base"]}]}}
{"version":"v0.9","updateComponents":{"surfaceId":"party-list","components":[{"id":"note","component":"Text","text":"勾选只记录采购状态，不改变食材用量。"},{"id":"root","component":"Column","children":["base","note"]}]}}
```

**两种常见错误：** 复选项已经显示后，再写整个 `/form` 会清掉用户的勾选；应只初始化新的兄弟路径。追加提示时只发送 `"children":["note"]` 会丢失首区；应像上例一样保留 `"base"`。遇到明确的宿主错误反馈，只按要求修复未提交部分；没有反馈时不宣称已上屏或已通过校验。
