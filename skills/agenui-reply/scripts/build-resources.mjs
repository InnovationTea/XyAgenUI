// Maintainer utility: derive small per-component/function references from the pinned snapshot.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { skillRoot, readJson, officialCommit, propertiesOf } from './lib/catalog.mjs';
const write = (file, text) => fs.writeFileSync(path.join(skillRoot, file), text, 'utf8');
const json = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
const catalog = readJson('vendor/agenui_catalog.json');
const componentNotes = {
  Text: '短标题、正文、指标与提示。用 variant 和黑灰层级组织信息；动态结果绑定路径或值函数。',
  Image: '有真实图片来源时使用；不编造图片链接。说明图片在任务中的作用。',
  Icon: '使用 schema 中已支持的图标名，辅助识别；不要让图标取代必要的文字说明。',
  Video: '用户确需查看视频且已有真实资源时使用。', AudioPlayer: '已有可用音频且任务需要收听时使用。',
  Row: '少量横向信息或左右对齐指标。窄屏下保护短标签、金额与按钮，过密时改为纵排。',
  Column: '纵向分区及根布局。静态 children 引用 ID；动态 children 使用路径与模板 ID。',
  List: '重复条目及列表。动态模板内部绑定相对字段名；不要用组件 ID 代替数据路径。',
  Card: '完整语义区域的白色或中性浅色卡片，单一 child 引用内容容器；避免重复嵌套视觉外壳。',
  Tabs: '同一任务的互斥信息视角；tabs[].child 引用对应内容，不在字段中内嵌组件对象。',
  Modal: '需要暂时展开的附加信息；trigger 和 content 均为组件 ID。',
  Divider: '必要时区分卡片内部信息组，避免每行都加分隔线。',
  Button: '必须有可见标签和已声明接收方。action.functionCall 使用动作函数；首次渲染前注册 action 深解析。',
  TextField: '收集文字或数字文本。value 必须绑定可写路径，官方 DynamicString 要求 string 初值，number 变体也相同；宿主负责数值文本过滤和需要的转换。',
  CheckBox: '单个布尔选择；value 绑定 boolean 初值。',
  ChoicePicker: '在方案中单选或多选。value 始终绑定 string[]，mutuallyExclusive 最多一项；显示标签与稳定 value 分开。',
  Slider: '调整有范围的数值参数。value 绑定 number，明确 min/max，结果通过依赖路径与值函数联动。',
  DateTimeInput: '选择日期或时间；value 绑定 ISO 8601 字符串，未选时为空字符串。默认时间要写入数据模型。',
  RichText: '需要少量行内富文本时使用官方支持的标签；不要混用完整网页结构。',
  Table: '多选项同维度比较。columns 为字符串数组，rows 为字符串二维数组，每行与列数一致。',
  Web: '任务确需嵌入网页且宿主支持时使用；不要用 Web 绕过组件和能力约束。',
  Carousel: '有多张真实图片时按需轮播；content 是图片 URL 数组，不是组件引用数组。',
  Markdown: 'Playground 示例扩展，默认关闭；宿主注册并开启配置后可使用。',
  Chart: 'Playground 示例扩展，默认关闭；先确认原生图表组件已注册。',
  Lottie: 'Playground 示例扩展，默认关闭；仅在动画有助任务时启用。'
};
const functionNotes = {
  required: '校验值不为空。用作 checks 的布尔条件。', regex: '按给定正则模式校验字符串。',
  length: '校验字符串长度，min/max 至少提供一个。', numeric: '校验数值范围，min/max 至少提供一个。',
  email: '校验电子邮件格式。', formatString: '插入数据路径或具名函数表达式；支持嵌套 ${…}，字面量起始符使用反斜线转义。',
  formatNumber: '按 decimals、grouping 格式化数字；依赖宿主区域设置。', formatCurrency: '按 ISO 4217 货币代码格式化金额。',
  formatDate: '按 Unicode TR35 模式格式化日期，例如 yyyy-MM-dd HH:mm。', pluralize: '按 CLDR 数量分类选择文案，必须提供 other。',
  token: '解析已注册的主题 token；不要假设宿主加载了任意 token。',
  and: '对至少两个布尔值做逻辑与。', or: '对至少两个布尔值做逻辑或。', not: '布尔取反。',
  openUrl: '动作函数。catalog 声明不代表已注册，宿主启用后只用于 action.functionCall。',
  calculateNumber: '宿主自定义值函数。left/right 支持数值、路径或嵌套计算；默认仅 add、multiply。返回中间数值时用 number，显示时可用 string。',
  sendMsgToXiaoyi: '宿主自定义动作。仅放在 Button.action.functionCall；query 必填，可附当前输入快照。名称大小写必须完全一致。',
  resolveCalls: '官方实现扩展，未列入固定 catalog，默认关闭。args.json 中嵌套 call 会被解析，path 保留；不能替代动作深解析。'
};
const index = [];
for (const name of Object.keys(catalog.components)) {
  const optional = ['Markdown', 'Chart', 'Lottie'].includes(name);
  const props = propertiesOf(catalog.components[name], catalog);
  json(`components/${name}.schema.json`, { $schema: catalog.$schema, $ref: `../vendor/agenui_catalog.json#/components/${name}` });
  write(`components/${name}.md`, `# ${name}\n\n${componentNotes[name]}\n\n状态：${optional ? '宿主注册后可选启用' : '默认组件'}。\n\n[字段定义](${name}.schema.json)由固定官方 catalog 提供；具体约束按 schema 校验，不猜测属性名。\n\n可用字段：${Object.keys(props).map(n => '`' + n + '`').join('、')}。\n\n${['TextField', 'ChoicePicker', 'Slider', 'DateTimeInput', 'CheckBox'].includes(name) ? '输入初值通过 updateDataModel 在首次绑定前发送。用户修改后不要重复初始化。\n' : ''}`);
  index.push(`| [${name}](${name}.md) | ${optional ? '扩展' : '默认'} | ${componentNotes[name].split('。')[0]} |`);
}
write('components/index.md', '# 组件索引\n\n默认 22 个 SDK 组件；3 个 Playground 示例扩展关闭。只读取本次任务需要的组件说明和 schema。通用样式与类型见 [官方快照](../vendor/agenui_catalog.json)。\n\n| 组件 | 支持 | 用途 |\n|---|---|---|\n' + index.join('\n') + '\n');
for (const name of Object.keys(catalog.functions)) json(`capabilities/functions/${name}.schema.json`, { $schema: catalog.$schema, $ref: `../../vendor/agenui_catalog.json#/functions/${name}` });
for (const [name, note] of Object.entries(functionNotes)) {
  const schema = catalog.functions[name] || readJson(`capabilities/functions/${name}.schema.json`);
  const args = schema.properties.args;
  write(`capabilities/functions/${name}.md`, `# ${name}\n\n${note}\n\n类型：${['sendMsgToXiaoyi', 'openUrl'].includes(name) ? '动作，仅点击时调用' : '值函数，禁止嵌套发送动作'}。\n\n参数：${Object.keys(args?.properties || {}).map(n => '`' + n + '`' + (args.required?.includes(n) ? '（必填）' : '')).join('、')}。${name === 'sendMsgToXiaoyi' ? '允许额外快照字段，值必须符合 DynamicValue。' : ''}\n\n[精确签名](${name}.schema.json)。${['openUrl', 'resolveCalls'].includes(name) ? '默认不启用，由宿主能力配置开启。' : '默认配置要求宿主注册或提供此实现。'}\n`);
}
json('vendor/SOURCE.json', {
  project: 'AGenUI/AGenUI', commit: officialCommit,
  url: `https://github.com/AGenUI/AGenUI/blob/${officialCommit}/agenui_catalog.json`,
  license: 'Apache-2.0', licenseFile: 'LICENSE',
  sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(skillRoot, 'vendor/agenui_catalog.json'))).digest('hex'),
  modifications: '原始快照未修改；有效 schema 在 scripts/lib/catalog.mjs 中展平 TextStyles，并移除 Text 重复继承的通用样式限制，保留文本专用 common 定义；样例样式 overlay 独立维护。'
});
console.log('已更新组件、函数索引与来源记录');
