import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, skillRoot, readJson } from './lib/catalog.mjs';
import { parseMessages, validateMessages, componentRefs } from './lib/validator.mjs';

export function checkExample(name, env = loadCatalog()) {
  const complete = readJson(`examples/${name}.json`);
  const parsed = parseMessages(fs.readFileSync(path.join(skillRoot, `examples/${name}.ndjson`), 'utf8'), 'ndjson');
  assert.deepEqual(parsed.diagnostics, []);
  const full = validateMessages(complete, { env });
  const streamed = validateMessages(parsed.messages, { env, surface: 'new' });
  assert.deepEqual(full.diagnostics, []);
  assert.deepEqual(streamed.diagnostics, []);
  const id = complete.find(m => m.updateComponents).updateComponents.surfaceId;
  const expected = full.surfaces.get(id), actual = streamed.surfaces.get(id);
  assert.deepEqual(actual.components, expected.components);
  assert.deepEqual(actual.data, expected.data);
  const batches = [];
  for (const [i, message] of parsed.messages.entries()) {
    if (!message.updateComponents) continue;
    const prefix = validateMessages(parsed.messages.slice(0, i + 1), { env, surface: 'new' });
    assert.deepEqual(prefix.diagnostics, []);
    const nodes = prefix.surfaces.get(id).components, root = nodes.get('root');
    assert.ok(root.children.length > 0, '每批 root 至少显示一个完整区域');
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
    batches.push([...inBatch]);
  }
  assert.equal(parsed.messages.filter(m => m.updateDataModel).length, complete.filter(m => m.updateDataModel).length);
  return { name, components: expected.components.size, batches: batches.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(skillRoot, 'scripts/check-examples.mjs')) {
  const env = loadCatalog();
  for (const name of ['route', 'hotpot']) console.log(JSON.stringify(checkExample(name, env)));
}
