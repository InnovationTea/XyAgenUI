import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, skillRoot } from '../scripts/lib/catalog.mjs';
import { parseMessages, validateMessages } from '../scripts/lib/validator.mjs';
import { checkExample, checkNegativeExamples } from '../scripts/check-examples.mjs';

const env = loadCatalog();
const onlineExamples = [
  'examples/golden/interactive-append.ndjson',
  'examples/golden/concert-append.ndjson',
  'examples/snippets/minimal-card.ndjson',
  'examples/snippets/slider-result.ndjson',
  'examples/snippets/choice-action.ndjson',
  'examples/snippets/text-field-number.ndjson',
  'examples/snippets/dynamic-list.ndjson'
];

for (const file of onlineExamples) {
  test(`${file} 的每个可见批次都可解析并渲染`, () => {
    const result = checkExample(file, env);
    assert.ok(result.batches > 0);
  });
}

test('负例目录中的语法和状态错误可被预期诊断捕获', () => {
  assert.equal(checkNegativeExamples(env), 2);
});

test('演唱会流先建面和初始化数组，再逐区追加完整 root 与三行摘要', () => {
  const raw = fs.readFileSync(path.join(skillRoot, 'examples/golden/concert-append.ndjson'), 'utf8');
  const parsed = parseMessages(raw, 'ndjson');
  assert.deepEqual(parsed.diagnostics, []);
  const messages = parsed.messages;
  assert.deepEqual(messages[0], { version: 'v0.9', createSurface: { surfaceId: 'reply', catalogId: env.profile.catalogId } });
  assert.deepEqual(messages[1].updateDataModel, { surfaceId: 'reply', path: '/form/selected', value: ['anpu'] });
  assert.equal(messages.filter(message => message.updateDataModel).length, 1);
  const updates = messages.slice(2).map(message => message.updateComponents);
  assert.ok(updates.length >= 2);
  const allNodes = new Map();
  let children = [], rootStyles;
  for (const update of updates) {
    assert.equal(update.surfaceId, 'reply');
    const root = update.components.at(-1);
    assert.equal(root.id, 'root');
    assert.equal(root.component, 'Column');
    assert.deepEqual(root.children.slice(0, children.length), children);
    assert.ok(root.children.length > children.length);
    rootStyles ??= root.styles;
    assert.deepEqual(root.styles, rootStyles);
    children = root.children;
    for (const node of update.components) {
      if (node.id !== 'root') assert.ok(!allNodes.has(node.id), '后续区域不应重定义已有组件');
      allNodes.set(node.id, node);
    }
  }
  assert.deepEqual(children, ['page-title', 'demo-notice', 'concert-card-1', 'concert-card-2', 'choice-card']);
  const summaries = ['concert-1-summary', 'concert-2-summary'];
  for (const id of summaries) assert.equal(allNodes.get(id).styles['line-clamp'], 3);
  for (const node of allNodes.values()) {
    if (node.component === 'Text' && !summaries.includes(node.id)) assert.ok(!Object.hasOwn(node.styles || {}, 'line-clamp'));
  }
  assert.ok(raw.includes('\\n'), '线上字符串换行必须转义');
  assert.ok(allNodes.get('concert-1-date').text.includes('\n'));
  assert.deepEqual(allNodes.get('concert-choice').value, { path: '/form/selected' });
  assert.deepEqual(allNodes.get('submit').action.functionCall.args.selected, { path: '/form/selected' });
  const result = validateMessages(messages, { env, surface: 'new' });
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.surfaces.get('reply').data.form.selected, ['anpu']);
});

test('后续区域追加后保留用户已修改的输入值', () => {
  const file = path.join(skillRoot, 'examples/golden/interactive-append.ndjson');
  const messages = parseMessages(fs.readFileSync(file, 'utf8'), 'ndjson').messages;
  const prefix = messages.slice(0, 3);
  const initial = validateMessages(prefix, { env, surface: 'new' });
  assert.deepEqual(initial.diagnostics, []);

  const hostData = structuredClone(initial.surfaces.get('party-planner').data);
  hostData.form.people = 8;
  for (const message of messages.slice(prefix.length)) {
    if (!message.updateDataModel) continue;
    assert.notEqual(message.updateDataModel.path, '/form/people');
    if (message.updateDataModel.path === '/form/route') hostData.form.route = message.updateDataModel.value;
  }
  assert.equal(hostData.form.people, 8);

  const last = messages.at(-1).updateComponents.components;
  assert.deepEqual(last.at(-1).children, ['people_card', 'route_card']);
  assert.ok(last.some(node => node.id === 'route_card'));
  assert.ok(!last.some(node => node.id === 'people_input'), '后续批次不应重新定义已展示的输入控件');
});
