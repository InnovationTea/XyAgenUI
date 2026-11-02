import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { skillRoot } from '../scripts/lib/catalog.mjs';

const run = (...args) => spawnSync(process.execPath, ['scripts/cli.mjs', ...args], { cwd: skillRoot, encoding: 'utf8' });
test('CLI 成功、中文结构化错误、退出码与标准输入', () => {
  assert.equal(run('validate', 'examples/route.json').status, 0);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenui-cli-'));
  try {
    const bad = path.join(dir, 'bad.json'); fs.writeFileSync(bad, '{');
    const r = run('validate', bad, '--json'); assert.equal(r.status, 1);
    const d = JSON.parse(r.stdout).diagnostics[0]; assert.equal(d.file, bad); assert.equal(d.index, 1); assert.equal(d.pointer, ''); assert.equal(d.code, 'E_PARSE');
    assert.equal(run('validate', bad, '--surface', 'fake').status, 2);
    assert.equal(run('validate', 'missing.json').status, 2);
    assert.equal(run('validate', 'examples/route.json', '--format', 'other').status, 2);
    const m = { version: 'v0.9', updateComponents: { surfaceId: 'stdin', components: [{ id: 'root', component: 'Text', text: 'ok' }] } };
    assert.equal(spawnSync(process.execPath, ['scripts/cli.mjs', 'validate', '-'], { cwd: skillRoot, input: JSON.stringify(m), encoding: 'utf8' }).status, 0);
  } finally { fs.rmSync(dir, { recursive: true }); }
});
test('CLI stream 输出可验证 NDJSON，拒绝覆盖源文件', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenui-cli-'));
  try {
    const out = path.join(dir, 'reply.ndjson');
    assert.equal(run('stream', 'examples/route.json', '--regions', 'examples/route.regions.json', '--surface', 'new', '--out', out).status, 0);
    assert.equal(run('validate', out, '--surface', 'new').status, 0);
    assert.equal(run('stream', 'examples/route.json', '--regions', 'examples/route.regions.json', '--out', 'examples/route.json').status, 2);
  } finally { fs.rmSync(dir, { recursive: true }); }
});
