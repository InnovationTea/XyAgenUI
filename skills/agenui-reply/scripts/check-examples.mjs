import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, skillRoot } from './lib/catalog.mjs';
import { parseMessages, validateMessages, componentRefs } from './lib/validator.mjs';

export function checkExample(file, env = loadCatalog()) {
  const parsed = parseMessages(fs.readFileSync(path.resolve(skillRoot, file), 'utf8'), 'ndjson');
  assert.deepEqual(parsed.diagnostics, []);
  const streamed = validateMessages(parsed.messages, { env, surface: 'new' });
  assert.deepEqual(streamed.diagnostics, []);
  const id = parsed.messages.find(m => m.updateComponents).updateComponents.surfaceId;
  const actual = streamed.surfaces.get(id);
  const batches = [];
  const inputPaths = new Set();
  const inputNames = new Set(['Slider', 'ChoicePicker', 'TextField', 'CheckBox', 'DateTimeInput']);
  const overlaps = (a, b) => a === b || a === '/' || b === '/' || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
  for (const [i, message] of parsed.messages.entries()) {
    if (message.updateDataModel) {
      for (const boundPath of inputPaths) assert.ok(!overlaps(message.updateDataModel.path, boundPath), `不可重新初始化已展示输入 ${boundPath}`);
      continue;
    }
    if (!message.updateComponents) continue;
    const prefix = validateMessages(parsed.messages.slice(0, i + 1), { env, surface: 'new' });
    assert.deepEqual(prefix.diagnostics, []);
    const nodes = prefix.surfaces.get(id).components, root = nodes.get('root');
    const hasChildren = Array.isArray(root.children) ? root.children.length > 0 : root.children && typeof root.children.componentId === 'string';
    assert.ok(hasChildren, '每批 root 至少显示一个完整区域');
    const seen = new Set();
    const visit = nodeId => { assert.ok(nodes.has(nodeId)); if (seen.has(nodeId)) return; seen.add(nodeId); componentRefs(nodes.get(nodeId)).forEach(visit); };
    visit('root');
    assert.ok(seen.size > 1);
    const inBatch = new Set();
    for (const node of message.updateComponents.components) {
      for (const ref of componentRefs(node)) assert.ok(inBatch.has(ref) || batches.some(b => b.includes(ref)), '子组件必须先于父组件');
      inBatch.add(node.id);
    }
    assert.equal(message.updateComponents.components.at(-1).id, 'root');
    for (const node of message.updateComponents.components) {
      if (inputNames.has(node.component) && typeof node.value?.path === 'string') inputPaths.add(node.value.path);
    }
    batches.push([...inBatch]);
  }
  const componentIds = new Set(parsed.messages.flatMap(m => m.updateComponents?.components.map(n => n.id) || []));
  return { file, components: componentIds.size, batches: batches.length, data: actual.data };
}

export function checkNegativeExamples(env = loadCatalog()) {
  const expected = JSON.parse(fs.readFileSync(path.join(skillRoot, 'examples/negative/expected.json'), 'utf8'));
  for (const [file, code] of Object.entries(expected)) {
    const parsed = parseMessages(fs.readFileSync(path.join(skillRoot, 'examples/negative', file), 'utf8'), 'ndjson');
    const diagnostics = parsed.diagnostics.length ? parsed.diagnostics : validateMessages(parsed.messages, { env, surface: 'new' }).diagnostics;
    assert.ok(diagnostics.some(d => d.code === code), `${file} 应产生 ${code}，实际为 ${JSON.stringify(diagnostics)}`);
  }
  return Object.keys(expected).length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(skillRoot, 'scripts/check-examples.mjs')) {
  const env = loadCatalog();
  for (const file of ['examples/golden/interactive-append.ndjson', 'examples/snippets/minimal-card.ndjson', 'examples/snippets/slider-result.ndjson', 'examples/snippets/choice-action.ndjson', 'examples/snippets/text-field-number.ndjson', 'examples/snippets/dynamic-list.ndjson']) {
    console.log(JSON.stringify(checkExample(file, env)));
  }
  console.log(JSON.stringify({ negative: checkNegativeExamples(env) }));
}
