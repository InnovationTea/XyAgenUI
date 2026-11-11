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
