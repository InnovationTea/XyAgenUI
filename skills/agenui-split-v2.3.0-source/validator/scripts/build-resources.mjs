// Generate model references and machine schemas from the SAME effective catalog.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadCatalog, validatorRoot, readJson, propertiesOf } from './lib/catalog.mjs';
import { contractStamp } from './lib/contract-stamp.mjs';
import { writeArtifact as write } from '../authoring/output.mjs';
const env=loadCatalog(), { profile, catalog }=env;
const notes = readJson('authoring/resource-notes.json');
write('generated/effective-catalog.json', catalog);
write('generated/contract-stamp.json', contractStamp(env));
function resolve(s) {
  return s?.$ref?.startsWith('#/') ? s.$ref.slice(2).split('/').reduce((v, key) => v?.[key], catalog) : s;
}
function required(s, seen = new Set()) {
  if (!s || (s.$ref && seen.has(s.$ref))) return [];
  if (s.$ref) { seen.add(s.$ref); return required(resolve(s), seen); }
  return [...new Set([...(s.required || []), ...(s.allOf || []).flatMap(v => required(v, new Set(seen)))])];
}
function shape(s, level = 0) {
  if (!s) return '按有效 Schema';
  if (s.$ref) {
    const leaf = s.$ref.split('/').at(-1);
    const alias = { common_types_DynamicString: 'string / {path} / 返回 string 的函数', common_types_DynamicNumber: 'number / {path} / 返回 number 的函数', common_types_DynamicBoolean: 'boolean / {path} / 返回 boolean 的函数', common_types_DynamicStringList: 'string[] / {path}', common_types_DynamicValue: '受控动态值' };
    if (alias[leaf]) return alias[leaf];
    if (level > 2) return leaf.replace(/^common_types_/, '');
    return shape(resolve(s), level + 1);
  }
  if (Object.hasOwn(s, 'const')) return JSON.stringify(s.const);
  if (s.enum) return s.enum.map(v => JSON.stringify(v)).join(' / ');
  if (s.type === 'array') return `数组<${shape(s.items, level + 1)}>`;
  if (s.type === 'object') return level > 2 ? 'object' : `{ ${Object.keys(s.properties || {}).join(', ')} }`;
  if (s.anyOf || s.oneOf) return (s.anyOf || s.oneOf).map(v => shape(v, level + 1)).join(' 或 ');
  if (s.allOf) return s.allOf.map(v => shape(v, level + 1)).join(' + ');
  return s.type || '按有效 Schema';
}
const rows = [];
for (const name of Object.keys(catalog.components)) {
  const props = propertiesOf(catalog.components[name], catalog), req = required(catalog.components[name]);
  const enabled = profile.components.includes(name);
  write(`components/${name}.schema.json`, { $schema: catalog.$schema, $ref: `../generated/effective-catalog.json#/components/${name}` });
  let text = `# ${name}\n\n${notes.components[name] || ''}\n\n默认 ${enabled ? '启用' : '**关闭**，仅宿主注册后启用'}。先读实际 profile；不要用样例扩大能力。\n\n样式：[完整变体](../styles/templates/${name}.json)；例子：[独立消息](../examples/components/${name}.ndjson)。组件片段与完整消息不可混淆。模板元信息不进入输出。\n\n## 字段\n\n|字段|必填|类型 / 枚举|\n|---|---|---|\n`;
  for (const [key, s] of Object.entries(props)) {
    if (['styles','accessibility'].includes(key)) continue;
    text += `|\`${key}\`|${req.includes(key) ? '是' : '否'}|${shape(s).replaceAll('|',' / ')}|\n`;
  }
  text += '\n`styles` 只复制该组件的已展开样式，不从 Text 跨类型复制。精确结构：[有效 Schema](' + name + '.schema.json)。输入类型、ID 引用和函数位置见[语法卡](../references/protocol.md)。\n';
  if (['Image','Carousel','AudioPlayer','Video','Lottie'].includes(name)) text += '\n例子内资源地址仅离线夹具；没有真实资源就选择其他表达，不把占位符发到用户界面。\n';
  write(`components/${name}.md`, text);
  rows.push(`|[${name}](${name}.md)|${enabled ? '启用' : '需注册'}|[样式](../styles/templates/${name}.json)|`);
}
write('components/index.md', '# 组件索引\n\n按任务选择，按实际 profile 启用；不是必须凑齐的组件清单。字段文档来自 `loadCatalog()` 的有效契约，不以原始快照或历史样例覆盖宿主规则。先看[场景决策](../references/selection.md)与[样式索引](../styles/INDEX.md)，只读本批使用项。\n\n|组件|默认状态|视觉|\n|---|---|---|\n' + rows.join('\n') + '\n');
for (const [name, fn] of Object.entries(catalog.functions)) {
  write(`capabilities/functions/${name}.schema.json`, { $schema: catalog.$schema, $ref: `../../generated/effective-catalog.json#/functions/${name}` });
  let text = `# ${name}\n\n${notes.functions[name] || ''}\n\n默认 ${profile.functions.includes(name) ? '启用' : '**关闭**'}；类型：${profile.actions.includes(name) || name === 'openUrl' ? '动作，只能放在 action.functionCall' : '值函数，仅放在可接受该返回类型的位置'}。实际执行由宿主负责。\n\n`;
  text += `对象必填：${(fn.required || []).map(x => '`' + x + '`').join('、')}。returnType：${shape(fn.properties?.returnType)}。\n\n|参数|必填|类型 / 枚举|\n|---|---|---|\n`;
  for (const [key, s] of Object.entries(fn.properties?.args?.properties || {})) text += `|\`${key}\`|${fn.properties.args.required?.includes(key) ? '是' : '否'}|${shape(s)}|\n`;
  text += `\n采用结构化函数对象，具体写法见[交互契约](../../references/interaction.md)。[精确签名](${name}.schema.json)。不要编造运算符或将动作嵌进显示表达式。\n`;
  write(`capabilities/functions/${name}.md`, text);
}
write('generated/CONTRACT.json', { note:'此处effectiveCatalogSha256为格式化文件字节哈希；跨端握手使用contract-stamp.json的contractSha256（规范化内容哈希）。', profileVersion: profile.version, protocol: profile.protocolVersion, catalogId: profile.catalogId,
  effectiveCatalogSha256: crypto.createHash('sha256').update(JSON.stringify(catalog,null,2)+'\n').digest('hex'),
  vendorSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(validatorRoot,'vendor/agenui_catalog.json'))).digest('hex'),
  override: '保留新版上传的 Catalog 别名、Text line-clamp 正整数规则、宿主扩展和兼容样式；用户确认vp/无单位长度默认vp，px仅兼容历史输入；原 vendor 未修改。' });
console.log('已从有效 Catalog 生成 25 组件和函数契约');
