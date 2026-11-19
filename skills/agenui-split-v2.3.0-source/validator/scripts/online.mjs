#!/usr/bin/env node
// Strict online gate. stdout contains accepted A2UI only; diagnostics go to stderr.
import fs from 'node:fs';
import { once } from 'node:events';
import { parseArgs } from 'node:util';
import { ReplySession, NDJSONReplyStream } from './lib/session.mjs';
import { loadCatalog } from './lib/catalog.mjs';
try {
  const { values, positionals } = parseArgs({ allowPositionals: true, strict: true, options: {
    profile: { type: 'string' }, surface: { type: 'string', default: 'new' },
    'surface-id': { type: 'string' }, 'strict-final-newline': { type: 'boolean', default: false }
  } });
  if (positionals.length > 1) throw new Error('用法：node scripts/online.mjs [文件|-] [--surface-id ID] [--profile 文件]');
  const session = new ReplySession({ env: loadCatalog(values.profile), surface: values.surface, surfaceId: values['surface-id'] });
  let backpressure = false;
  const stream = new NDJSONReplyStream({ session, requireFinalNewline: values['strict-final-newline'],
    onMessage: m => { if (!process.stdout.write(JSON.stringify(m) + '\n')) backpressure = true; },
    onError: result => process.stderr.write(JSON.stringify(result) + '\n')
  });
  const input = !positionals[0] || positionals[0] === '-' ? process.stdin : fs.createReadStream(positionals[0]);
  let halted = false;
  for await (const chunk of input) {
    if (stream.push(chunk).some(r => !r.valid)) { halted = true; process.exitCode = 1; break; }
    if (backpressure) { await once(process.stdout, 'drain'); backpressure = false; }
  }
  if (!halted) {
    const result = stream.finish();
    if (!result.valid) { process.stderr.write(JSON.stringify(result) + '\n'); process.exitCode = 1; }
  }
} catch (error) { process.stderr.write(JSON.stringify({ valid: false, diagnostics: [{ code: 'E_TOOL', message: error.message }] }) + '\n'); process.exitCode = 2; }
