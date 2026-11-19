import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { validatorRoot,loadCatalog,readJson } from './lib/catalog.mjs';
import { contractStamp } from './lib/contract-stamp.mjs';
import { parseMessages } from './lib/validator.mjs';
import { lintVisual,contrastRatio } from './lib/visual-lint.mjs';
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile())files.push(p);}}
walk(validatorRoot);
const broken=[];
for(const f of files.filter(p=>p.endsWith('.md'))){
 const text=fs.readFileSync(f,'utf8');
 for(const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
  const link=m[1].split('#')[0];if(!link||/^[a-z]+:/i.test(link)||link.includes('<'))continue;
  if(!fs.existsSync(path.resolve(path.dirname(f),link)))broken.push({file:path.relative(validatorRoot,f),link});
 }
}
assert.deepEqual(broken,[],'存在无效内部链接');
const env=loadCatalog();
assert.deepEqual(readJson('generated/effective-catalog.json'),env.catalog,'有效Catalog未同步；运行build');
assert.deepEqual(readJson('generated/contract-stamp.json'),contractStamp(env),'发布契约指纹与实际运行配置不一致');
for (const name of Object.keys(env.catalog.components)) env.component(name);
for (const name of Object.keys(env.catalog.functions)) env.fn(name);
const visual=[];
for(const folder of ['golden','snippets'])for(const name of fs.readdirSync(path.join(validatorRoot,'fixtures',folder)).filter(n=>n.endsWith('.ndjson')&&!n.includes('unit-calibration'))){
 const file=`fixtures/${folder}/${name}`, parsed=parseMessages(fs.readFileSync(path.join(validatorRoot,file),'utf8'),'ndjson');
 assert.deepEqual(parsed.diagnostics,[]);const result=lintVisual(parsed.messages);visual.push({file,...result});
 assert.deepEqual(result.warnings,[],`${file}视觉静态规则警告`);
}
const colors=readJson('authoring/styles/tokens.json').colors,contrast=[];
for(const theme of ['light','dark']){
 for(const [fg,bg] of [['primary','surface'],['secondary','surface'],['muted','surface'],['accent','surface'],['onAction','action'],['error','surface'],['inputBorder','surface']]){
  const ratio=contrastRatio(colors[theme][fg],colors[theme][bg]),minimum=fg==='inputBorder'?3:4.5;
  assert.ok(ratio>minimum,`${theme} ${fg}/${bg}`);contrast.push({theme,foreground:fg,background:bg,ratio,minimum,pass:true});
 }
}
const vendor=crypto.createHash('sha256').update(fs.readFileSync(path.join(validatorRoot,'vendor/agenui_catalog.json'))).digest('hex');
assert.equal(vendor,readJson('vendor/SOURCE.json').sha256);
const result={internalLinks:'pass',effectiveCatalog:'matches',schemaReferences:'compiled',contractStamp:'matches',vendorHash:'unchanged',visualWarnings:0,visualFiles:visual.length,opaqueContrastPairs:contrast.length,nativeTested:false};
fs.mkdirSync(path.join(validatorRoot,'validation'),{recursive:true});
fs.writeFileSync(path.join(validatorRoot,'validation/audit.json'),JSON.stringify({summary:result,visual,contrast},null,2)+'\n');
console.log(JSON.stringify(result));
