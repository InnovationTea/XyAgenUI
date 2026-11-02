#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { parseMessages, validateMessages } from './lib/validator.mjs';
import { streamMessages } from './lib/stream.mjs';

const help = `AGenUI 中文 DSL 工具（Node.js 22+）
  node scripts/cli.mjs validate <文件|-> [--format auto|json|ndjson] [--surface existing|new] [--profile 文件] [--state 文件] [--json]
  node scripts/cli.mjs stream <文件|-> --regions 文件 [--surface existing|new] [--profile 文件] [--state 文件] [--out 文件]
validate 退出码：0 合法，1 内容不合法，2 配置或工具错误。
state 文件格式：{ "surfaceId": { "form": { ... } } }。existing 假设宿主已建面，new 要求 createSurface。
stream 的 regions 文件：[["概览卡ID"],["结果卡ID","提交按钮ID"]]。输出 NDJSON，不发送任何动作。`;

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, strict: true, options: {
    help: { type: 'boolean', short: 'h' }, json: { type: 'boolean' },
    format: { type: 'string', default: 'auto' }, surface: { type: 'string', default: 'existing' },
    profile: { type: 'string' }, state: { type: 'string' }, regions: { type: 'string' }, out: { type: 'string' }
  } });
  if (values.help) { console.log(help); process.exit(0); }
  const [command, file] = positionals;
  if (!['validate', 'stream'].includes(command) || !file || positionals.length !== 2) throw new Error(help);
  if (!['auto', 'json', 'ndjson'].includes(values.format)) throw new Error('format 必须为 auto、json 或 ndjson');
  if (!['existing', 'new'].includes(values.surface)) throw new Error('surface 必须为 existing 或 new');
  const options = { surface: values.surface, profile: values.profile && path.resolve(values.profile), state: values.state ? JSON.parse(fs.readFileSync(values.state, 'utf8').replace(/^\uFEFF/, '')) : undefined };
  const parsed = parseMessages(fs.readFileSync(file === '-' ? 0 : file, 'utf8'), values.format);
  let diagnostics = parsed.diagnostics;
  if (!diagnostics.length) {
    if (command === 'stream') {
      if (!values.regions) throw new Error('stream 需要 --regions 文件');
      const regions = JSON.parse(fs.readFileSync(values.regions, 'utf8').replace(/^\uFEFF/, ''));
      const messages = streamMessages(parsed.messages, regions, options);
      const output = messages.map(m => JSON.stringify(m)).join('\n') + '\n';
      if (values.out) {
        if (file !== '-' && path.resolve(file) === path.resolve(values.out)) throw new Error('输出文件不能覆盖输入文件');
        fs.writeFileSync(values.out, output, 'utf8');
      } else process.stdout.write(output);
      process.exit(0);
    }
    diagnostics = validateMessages(parsed.messages, options).diagnostics;
  }
  diagnostics = diagnostics.map(d => ({ file, ...d }));
  if (values.json) console.log(JSON.stringify({ valid: !diagnostics.length, diagnostics }, null, 2));
  else if (diagnostics.length) for (const d of diagnostics) console.error(`${d.file} 消息${d.index} ${d.pointer || '/'} [${d.code}] ${d.message}`);
  else console.log(`${file}：校验通过（${parsed.messages.length} 条消息）`);
  process.exitCode = diagnostics.length ? 1 : 0;
} catch (error) {
  console.error(`[${error.contentError ? 'E_CONTENT' : 'E_TOOL'}] ${error.message}`);
  process.exitCode = error.contentError ? 1 : 2;
}
