import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { skillRoot } from '../scripts/lib/catalog.mjs';

const run = (...args) => spawnSync(process.execPath, ['scripts/cli.mjs', ...args], { cwd: skillRoot, encoding: 'utf8' });
test('CLI 成功、中文结构化错误、退出码与标准输入', () => {
  assert.equal(run('validate', 'examples/golden/interactive-append.ndjson').status, 0);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenui-cli-'));
  try {
    const bad = path.join(dir, 'bad.json'); fs.writeFileSync(bad, '{');
    const r = run('validate', bad, '--json'); assert.equal(r.status, 1);
    const d = JSON.parse(r.stdout).diagnostics[0]; assert.equal(d.file, bad); assert.equal(d.index, 1); assert.equal(d.pointer, ''); assert.equal(d.code, 'E_PARSE');
    assert.equal(run('validate', bad, '--surface', 'fake').status, 2);
    assert.equal(run('validate', 'missing.json').status, 2);
    assert.equal(run('validate', 'examples/golden/interactive-append.ndjson', '--format', 'other').status, 2);
    const m = { version: 'v0.9', updateComponents: { surfaceId: 'stdin', components: [{ id: 'root', component: 'Text', text: 'ok' }] } };
    const stdin = { cwd: skillRoot, input: JSON.stringify(m), encoding: 'utf8' };
    const missingSurface = spawnSync(process.execPath, ['scripts/cli.mjs', 'validate', '-', '--json'], stdin);
    assert.equal(missingSurface.status, 1);
    assert.ok(JSON.parse(missingSurface.stdout).diagnostics.some(d => d.code === 'E_SURFACE_MISSING'));
    assert.equal(spawnSync(process.execPath, ['scripts/cli.mjs', 'validate', '-', '--surface', 'existing'], stdin).status, 0);
  } finally { fs.rmSync(dir, { recursive: true }); }
});
test('CLI stream 输出可验证 NDJSON，拒绝覆盖源文件', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenui-cli-'));
  try {
    const source = path.join(dir, 'source.json');
    const regions = path.join(dir, 'regions.json');
    const out = path.join(dir, 'reply.ndjson');
    fs.writeFileSync(source, JSON.stringify([{ version: 'v0.9', updateComponents: { surfaceId: 'stream', components: [{ id: 'label', component: 'Text', text: '结果' }, { id: 'root', component: 'Column', children: ['label'] }] } }]));
    fs.writeFileSync(regions, JSON.stringify([['label']]));
    assert.equal(run('stream', source, '--regions', regions, '--out', out).status, 0);
    const messages = fs.readFileSync(out, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(messages[0].createSurface.surfaceId, 'stream');
    assert.equal(run('validate', out).status, 0);
    const existing = run('stream', source, '--regions', regions, '--surface', 'existing');
    assert.equal(existing.status, 0);
    assert.equal(existing.stdout.trim().split('\n').some(line => JSON.parse(line).createSurface), false);
    assert.equal(run('stream', source, '--regions', regions, '--out', source).status, 2);
  } finally { fs.rmSync(dir, { recursive: true }); }
});
