import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadCatalog, readJson } from '../scripts/lib/catalog.mjs';
import { validateMessages, parseMessages, pathParts } from '../scripts/lib/validator.mjs';
import { parseTemplate } from '../scripts/lib/expressions.mjs';
import { streamMessages } from '../scripts/lib/stream.mjs';
import { nextSaturday18 } from '../scripts/lib/date.mjs';
import { checkExample, checkNegativeExamples } from '../scripts/check-examples.mjs';

const env = loadCatalog();
const init = (value = { form: { n: 3 } }) => ({ version: 'v0.9', updateDataModel: { surfaceId: 'test', path: '/', value } });
const update = nodes => ({ version: 'v0.9', updateComponents: { surfaceId: 'test', components: nodes } });
const text = (id = 'label', value = '说明') => ({ id, component: 'Text', text: value });
const root = (children = ['label']) => ({ id: 'root', component: 'Column', children, styles: { padding: '16px' } });
const slider = () => ({ id: 'slider', component: 'Slider', min: 0, max: 10, value: { path: '/form/n' } });
const check = (messages, options = {}) => validateMessages(messages, { env, ...options });
const valid = messages => assert.deepEqual(check(messages).diagnostics, []);
const invalid = (messages, code) => { const r = check(messages); assert.equal(r.valid, false); if (code) assert.ok(r.diagnostics.some(d => d.code === code), JSON.stringify(r.diagnostics)); return r; };
const calc = (left, right, operator = 'add') => ({ call: 'calculateNumber', returnType: 'number', args: { left, right, operator } });
const action = (args = { query: '继续 ${/form/n}', n: { path: '/form/n' } }) => ({ id: 'button', component: 'Button', child: 'label', action: { functionCall: { call: 'sendMsgToXiaoyi', args } } });

for (const file of [
  'examples/golden/interactive-append.ndjson',
  'examples/snippets/minimal-card.ndjson',
  'examples/snippets/slider-result.ndjson',
  'examples/snippets/choice-action.ndjson'
]) test(`${file} 的每个可见批次都可解析并渲染`, () => { const r = checkExample(file, env); assert.ok(r.batches > 0); });
test('负例目录中的语法和状态错误可被预期诊断捕获', () => assert.equal(checkNegativeExamples(env), 2));
test('自定义发送动作拒绝旧拼写和大小写变体', () => {
  for (const name of ['sendMsgtoxy', 'sendMsgToXy', 'sendmsgtoxiaoyi']) {
    const button = action(); button.action.functionCall.call = name;
    invalid([init(), update([root(['button']), text(), button])], 'E_COMPONENT_SCHEMA');
  }
});
test('未知组件', () => invalid([update([{ id: 'root', component: 'Fake' }])], 'E_COMPONENT'));
test('默认关闭 Playground 扩展', () => invalid([update([{ id: 'root', component: 'Markdown', content: 'x' }])], 'E_COMPONENT'));
test('拒绝未知属性与未知样式', () => { invalid([update([{ ...text('root'), nonsense: 1 }])], 'E_COMPONENT_SCHEMA'); invalid([update([{ ...text('root'), styles: { madeUp: 'red' } }])], 'E_COMPONENT_SCHEMA'); });
test('允许官方 Text 排版样式', () => valid([update([{ ...text('root'), styles: { color: '#333333', 'font-size': '20px', 'font-weight': '600' } }])]));
test('Text 完整显示省略 line-clamp，摘要允许三行且拒绝零和负值', () => {
  valid([update([text('root', '标题、日期和价格完整显示')])]);
  valid([update([{ ...text('root', '长描述摘要'), styles: { 'line-clamp': 3 } }])]);
  for (const clamp of [0, -1]) {
    const r = invalid([update([{ ...text('root'), styles: { 'line-clamp': clamp } }])], 'E_TEXT_LINE_CLAMP');
    assert.equal(r.diagnostics.find(d => d.code === 'E_TEXT_LINE_CLAMP').pointer, '/updateComponents/components/0/styles/line-clamp');
  }
  for (const clamp of [1.5, '3']) invalid([update([{ ...text('root'), styles: { 'line-clamp': clamp } }])], 'E_COMPONENT_SCHEMA');
});
test('Image 必须有显式正宽度并使用 HTTPS，静态拦截 HTTP 媒体 URL', () => {
  const image = { id: 'image', component: 'Image', url: 'https://cdn.example.test/photo.jpg', styles: { width: '100%' } };
  valid([update([root(['image']), image])]);
  const noWidth = check([update([root(['image']), { ...image, styles: undefined }])]);
  assert.ok(noWidth.diagnostics.some(d => d.code === 'E_IMAGE_WIDTH'));
  const zeroWidth = check([update([root(['image']), { ...image, styles: { width: '0px' } }])]);
  assert.ok(zeroWidth.diagnostics.some(d => d.code === 'E_IMAGE_WIDTH'));
  for (const nodes of [
    [root(['image']), { ...image, url: 'http://cdn.example.test/photo.jpg' }],
    [{ ...text('root'), styles: { 'background-image': 'url(http://cdn.example.test/bg.jpg)' } }],
    [root(['carousel']), { id: 'carousel', component: 'Carousel', content: ['https://cdn.example.test/a.jpg', 'http://cdn.example.test/b.jpg'] }]
  ]) assert.ok(check([update(nodes)]).diagnostics.some(d => d.code === 'E_IMAGE_URL'));
});
test('函数名拼写错误和参数错误', () => {
  invalid([update([text('root', { call: 'calculatenumer', args: {} })])], 'E_COMPONENT_SCHEMA');
  invalid([update([text('root', { call: 'formatNumber', args: { val: 2 } })])], 'E_COMPONENT_SCHEMA');
});
test('不启用未经证明的计算运算', () => invalid([update([text('root', { call: 'formatNumber', args: { value: calc(1, 2, 'divide') } })])], 'E_COMPONENT_SCHEMA'));
test('嵌套计算与动态参数', () => valid([init(), update([text('root', { call: 'formatNumber', returnType: 'string', args: { value: calc(calc(3, { path: '/form/n' }), 350, 'multiply'), decimals: 0 } })])]));
test('模板插值、嵌套具名函数与转义', () => valid([init(), update([text('root', "合计 ${formatNumber(value:calculateNumber(left:3,right:${/form/n},operator:'add'),decimals:0)}；原文 \\${/missing}")])]));
test('模板拒绝未闭合与非具名表达式', () => { invalid([update([text('root', '${formatNumber(3)}')])], 'E_TEMPLATE'); invalid([update([text('root', '${/x')])], 'E_TEMPLATE'); });
test('表达式解析仅输出语法节点', () => {
  assert.deepEqual(parseTemplate("${not(value:false)} ${and(values:[true,false])}"), [{ call: 'not', args: { value: false } }, { call: 'and', args: { values: [true, false] } }]);
  assert.deepEqual(parseTemplate('\\${/ignored}'), []);
  assert.throws(() => parseTemplate('${process.exit()}'));
  assert.throws(() => parseTemplate('${formatNumber(value:1,value:2)}'));
});
test('缺失依赖、循环和重复 ID', () => {
  invalid([update([root(['missing'])])], 'E_REFERENCE');
  invalid([update([root(['a']), { id: 'a', component: 'Column', children: ['root'] }])], 'E_CYCLE');
  invalid([update([text('root'), text('root')])], 'E_DUPLICATE_ID');
});
test('路径必须是绝对 Pointer，拒绝原型段与错误转义', () => {
  for (const p of ['form/n', '/form/~2n', '/__proto__/n', '/form//n']) invalid([init(), update([text('root', { path: p })])], 'E_PATH');
  assert.deepEqual(pathParts('/a~1b/c~0d'), ['a/b', 'c~d']);
});
test('允许 Pointer 字段中的点和斜杠转义', () => valid([init({ 'a.b': { 'c/d': 'ok' } }), update([text('root', { path: '/a.b/c~1d' })])]));
test('初值缺失或类型错误', () => {
  invalid([update([root(['slider']), slider()])], 'E_INITIAL_VALUE');
  const r = invalid([init({ form: { n: '3' } }), update([root(['slider']), slider()])], 'E_VALUE_TYPE');
  const d = r.diagnostics.find(d => d.code === 'E_VALUE_TYPE');
  assert.equal(d.index, 2); assert.equal(d.pointer, '/updateComponents/components/1/value/path');
});
test('晚于绑定初始化不能补救先前错误', () => invalid([update([root(['slider']), slider()]), init()], 'E_INITIAL_VALUE'));
test('滑块范围检查', () => invalid([init({ form: { n: 11 } }), update([root(['slider']), slider()])], 'E_RANGE'));
test('复合 schema 中的绑定仍检查初值类型', () => invalid([init({ date: '', min: 10 }), update([{ id: 'root', component: 'DateTimeInput', value: { path: '/date' }, min: { path: '/min' }, enableDate: true }])], 'E_VALUE_TYPE'));
test('日期初值支持仅时间，拒绝不存在的日期和越界时间', () => {
  const date = { id: 'root', component: 'DateTimeInput', value: { path: '/date' }, enableTime: true };
  valid([init({ date: '18:00:00' }), update([date])]);
  for (const value of ['2026-02-30', '2026-10-31T25:00', '2026-13-01']) invalid([init({ date: value }), update([date])], 'E_DATE');
});
test('输入必须绑定可写路径', () => invalid([update([root(['slider']), { ...slider(), value: 3 }])], 'E_INPUT_BINDING'));
test('单选和多选均为字符串数组', () => {
  const picker = { id: 'root', component: 'ChoicePicker', options: [{ label: '甲', value: 'a' }, { label: '乙', value: 'b' }], value: { path: '/selected' } };
  valid([init({ selected: ['a'] }), update([picker])]);
  invalid([init({ selected: 'a' }), update([picker])], 'E_VALUE_TYPE');
  invalid([init({ selected: ['a', 'b'] }), update([picker])], 'E_SELECTION');
  valid([init({ selected: ['a', 'b'] }), update([{ ...picker, variant: 'multipleSelection' }])]);
  invalid([init({ selected: ['x'] }), update([picker])], 'E_SELECTION');
});
test('数字文本字段仍绑定字符串', () => valid([init({ amount: '123' }), update([{ id: 'root', component: 'TextField', label: '金额', variant: 'number', value: { path: '/amount' } }])]));
test('合法按钮保留点击时动态声明', () => { const msg = [init(), update([root(['button']), text(), action()])]; valid(msg); assert.deepEqual(msg[1].updateComponents.components[2].action.functionCall.args.n, { path: '/form/n' }); });
test('禁止动作混入显示值及嵌套参数', () => {
  invalid([update([text('root', '${sendMsgToXiaoyi(query:"x")}')])], 'E_ACTION_POSITION');
  invalid([init(), update([root(['button']), text(), action({ query: 'x', nested: { call: 'sendMsgToXiaoyi', args: { query: 'x' } } })])], 'E_ACTION_POSITION');
});
test('值函数不能成为动作', () => invalid([update([root(['button']), text(), { ...action(), action: { functionCall: { call: 'formatString', args: { value: 'x' } } } }])], 'E_ACTION_POSITION'));
test('事件必须声明接收方', () => invalid([update([root(['button']), text(), { ...action(), action: { event: { name: 'unregistered' } } }])], 'E_EVENT'));
test('新建模式要求 Surface，重复创建错误', () => {
  const create = { version: 'v0.9', createSurface: { surfaceId: 'test', catalogId: env.profile.catalogId } };
  assert.ok(check([update([text('root')])], { surface: 'new' }).diagnostics.some(d => d.code === 'E_SURFACE_MISSING'));
  assert.equal(check([create, update([text('root')])], { surface: 'new' }).valid, true);
  invalid([create, create, update([text('root')])], 'E_SURFACE_EXISTS');
});
test('catalogId 固定为标准 URL，拒绝旧 ID 和 profile 覆盖', () => {
  const expected = 'https://a2ui.org/specification/v0_9/standard_catalog.json';
  assert.equal(env.profile.catalogId, expected);
  assert.equal(env.catalog.catalogId, expected);
  const create = catalogId => ({ version: 'v0.9', createSurface: { surfaceId: 'test', catalogId } });
  assert.equal(check([create(expected), update([text('root')])], { surface: 'new' }).valid, true);
  for (const catalogId of [readJson('vendor/agenui_catalog.json').catalogId, 'https://example.org/catalog.json']) {
    assert.ok(check([create(catalogId), update([text('root')])], { surface: 'new' }).diagnostics.some(d => d.code === 'E_CATALOG'));
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenui-catalog-'));
  try {
    const profile = { ...env.profile, catalogId: 'https://example.org/catalog.json' };
    const file = path.join(dir, 'profile.json');
    fs.writeFileSync(file, JSON.stringify(profile));
    assert.throws(() => loadCatalog(file), /catalogId 必须固定为/);
  } finally { fs.rmSync(dir, { recursive: true }); }
});
test('new 模式要求先建面再初始化数据，最后输出绑定组件', () => {
  const create = { version: 'v0.9', createSurface: { surfaceId: 'test', catalogId: env.profile.catalogId } };
  const components = update([root(['slider']), slider()]);
  assert.deepEqual(check([create, init(), components], { surface: 'new' }).diagnostics, []);
  for (const messages of [[init(), create, components], [components, create, init()]]) {
    const r = check(messages, { surface: 'new' });
    assert.equal(r.valid, false);
    assert.ok(r.diagnostics.some(d => d.code === 'E_SURFACE_MISSING' && d.index === 1));
  }
  assert.ok(check([create, components, init()], { surface: 'new' }).diagnostics.some(d => d.code === 'E_INITIAL_VALUE' && d.index === 2));
  const wrongSurface = structuredClone(init());
  wrongSurface.updateDataModel.surfaceId = 'other';
  assert.ok(check([create, wrongSurface, components], { surface: 'new' }).diagnostics.some(d => d.code === 'E_SURFACE_MISSING' && d.index === 2));
});
test('删除与重建 Surface 的生命周期', () => {
  const create = { version: 'v0.9', createSurface: { surfaceId: 'test', catalogId: env.profile.catalogId } };
  valid([create, update([text('root')]), { version: 'v0.9', deleteSurface: { surfaceId: 'test' } }, create, update([text('root')])]);
});
test('流结束缺 root 与截断 JSON', () => { invalid([update([text('child')])], 'E_ROOT'); assert.equal(parseMessages('{"version":').diagnostics[0].code, 'E_PARSE'); assert.equal(parseMessages('{}\n{"version":').diagnostics[0].line, 2); });
test('单消息、数组、NDJSON、BOM 与空输入', () => {
  const m = update([text('root')]);
  for (const raw of [JSON.stringify(m), JSON.stringify([m]), '\uFEFF' + JSON.stringify(m), JSON.stringify(m) + '\n']) assert.deepEqual(parseMessages(raw).messages, [m]);
  assert.deepEqual(parseMessages(JSON.stringify(m) + '\n' + JSON.stringify(m), 'ndjson').messages, [m, m]);
  assert.equal(parseMessages('').diagnostics[0].code, 'E_PARSE');
});
test('JSON 拒绝智能引号和未转义换行，标准双引号和转义换行可通过', () => {
  const message = update([text('root', '第一行\n第二行')]);
  const escaped = JSON.stringify(message);
  assert.ok(escaped.includes('\\n'));
  for (const format of ['auto', 'json', 'ndjson']) {
    const parsed = parseMessages(escaped, format);
    assert.deepEqual(parsed.diagnostics, []);
    assert.equal(parsed.messages[0].updateComponents.components[0].text, '第一行\n第二行');
    valid(parsed.messages);
    for (const raw of [escaped.replaceAll('"', '“'), escaped.replace('\\n', '\n')]) {
      assert.equal(parseMessages(raw, format).diagnostics[0].code, 'E_PARSE');
    }
  }
  // 智能引号可以作为合法字符串内容，但不能用作 JSON 分隔符。
  valid(parseMessages(JSON.stringify(update([text('root', '“引用内容”')]))).messages);
});
test('同 ID 为完整替换，省略样式不会合并', () => {
  const r = check([update([{ ...text('root'), styles: { color: '#333333' } }]), update([text('root', '新内容')])]);
  assert.equal(r.valid, true); assert.equal(r.surfaces.get('test').components.get('root').styles, undefined);
});
test('保护已展示输入，允许初始化其他区域', () => {
  const prefix = [init(), update([root(['slider']), slider()])];
  invalid([...prefix, init()], 'E_STATE_RESET');
  valid([...prefix, { version: 'v0.9', updateDataModel: { surfaceId: 'test', path: '/other', value: 2 } }]);
});
test('宿主已有状态可独立提供', () => assert.equal(check([update([root(['slider']), slider()])], { state: { test: { form: { n: 5 } } } }).valid, true));
test('动态列表模板支持相对绑定和空数组', () => {
  const nodes = [{ id: 'root', component: 'Column', children: { path: '/items', componentId: 'item' } }, text('item', { path: 'name' })];
  valid([init({ items: [{ name: '一' }, { name: '二' }] }), update(nodes)]);
  valid([init({ items: [] }), update(nodes)]);
  invalid([init({ items: [{ name: 1 }] }), update(nodes)], 'E_VALUE_TYPE');
});
test('stream 显式区域、依赖顺序、完整 root 和一次初值', () => {
  const input = [init(), update([root(['a', 'b']), text('a'), text('b')])];
  const result = streamMessages(input, [['a'], ['b']], { env });
  assert.deepEqual(result[0], { version: 'v0.9', createSurface: { surfaceId: 'test', catalogId: env.profile.catalogId } });
  assert.deepEqual(result[1], init());
  assert.equal(result.filter(m => m.updateDataModel).length, 1);
  assert.deepEqual(result[2].updateComponents.components.map(n => n.id), ['a', 'root']);
  assert.deepEqual(result[3].updateComponents.components.at(-1), root(['a', 'b']));
  assert.deepEqual(check(result, { surface: 'new' }).diagnostics, []);
  const existing = streamMessages(input, [['a'], ['b']], { env, surface: 'existing' });
  assert.equal(existing.some(m => m.createSurface), false);
  assert.deepEqual(existing, result.slice(1));
});
test('stream 拒绝重排、遗漏、不可达组件及复杂根', () => {
  const input = [update([root(['a', 'b']), text('a'), text('b')])];
  for (const regions of [[['a']], [['b'], ['a']], [['a'], ['a', 'b']]]) assert.throws(() => streamMessages(input, regions, { env }));
  assert.throws(() => streamMessages([update([...input[0].updateComponents.components, text('extra')])], [['a'], ['b']], { env }));
  assert.throws(() => streamMessages([update([text('root')])], [['root']], { env }));
});
test('stream 新建模式保留原 Surface 配置', () => {
  const create = { version: 'v0.9', createSurface: { surfaceId: 'test', catalogId: env.profile.catalogId, theme: {}, sendDataModel: true } };
  const r = streamMessages([create, update([root(), text()])], [['label']], { env, surface: 'new' });
  assert.deepEqual(r[0], create);
});
test('可选能力需宿主配置，并继续隔离 resolveCalls 中的动作', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenui-profile-'));
  try {
    const profile = readJson('capabilities/profiles/default.json');
    profile.functions.push('resolveCalls', 'openUrl'); profile.actions.push('openUrl');
    const file = path.join(dir, 'profile.json'); fs.writeFileSync(file, JSON.stringify(profile));
    const enabled = loadCatalog(file);
    const nodes = [root(['button']), text(), { ...action(), action: { functionCall: { call: 'openUrl', args: { url: 'https://example.com' } } } }];
    assert.equal(check([update(nodes)], { env: enabled }).valid, true);
    assert.equal(check([update(nodes)]).valid, false);
    const wrapped = { call: 'resolveCalls', returnType: 'any', args: { json: { call: 'sendMsgToXiaoyi', args: { query: 'x' } } } };
    assert.ok(check([update([root(['button']), text(), action({ query: 'x', wrapped })])], { env: enabled }).diagnostics.some(d => d.code === 'E_ACTION_POSITION'));
    profile.styleCompatibility = false; fs.writeFileSync(file, JSON.stringify(profile));
    const strict = loadCatalog(file);
    const incompatibleStyle = [init({ route: [] }), update([
      root(['picker']),
      { id: 'picker', component: 'ChoicePicker', options: [{ label: '甲', value: 'a' }], value: { path: '/route' }, styles: { 'checkbox-background-color-selected': '#000000' } }
    ])];
    assert.equal(check(incompatibleStyle, { env }).valid, true);
    assert.equal(check(incompatibleStyle, { env: strict }).valid, false);
  } finally { fs.rmSync(dir, { recursive: true }); }
});
test('时区与下一个可用周六 18:00（包含夏令时边界）', () => {
  assert.equal(nextSaturday18(new Date('2026-10-30T12:00:00Z'), 'Asia/Shanghai'), '2026-10-31T18:00:00+08:00');
  assert.equal(nextSaturday18(new Date('2026-10-31T21:00:00Z'), 'America/New_York'), '2026-10-31T18:00:00-04:00');
  assert.equal(nextSaturday18(new Date('2026-10-31T22:00:00Z'), 'America/New_York'), '2026-11-07T18:00:00-05:00');
  assert.equal(nextSaturday18(new Date('2026-03-08T12:00:00Z'), 'America/New_York'), '2026-03-14T18:00:00-04:00');
  assert.throws(() => nextSaturday18(new Date(), 'No/SuchZone'));
});
