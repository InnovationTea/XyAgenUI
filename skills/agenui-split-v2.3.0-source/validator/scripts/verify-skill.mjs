// Release QA of the actual model-facing Markdown (not only the underlying JSON sources).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {validatorRoot,loadCatalog} from './lib/catalog.mjs';
import {contractStamp,NDJSONReplyStream,ReplySession} from './lib/index.mjs';
import {expandTemplate} from './lib/styles.mjs';
const root=path.resolve(process.argv[2] || path.join(validatorRoot,'../agenui-reply-skill'));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const env=loadCatalog(), stamp=contractStamp(env), profile=json('references/host-profile.json');
assert.deepEqual(profile,env.profile);assert.deepEqual(json('generated/contract-stamp.json'),stamp);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const f=path.join(dir,e.name);assert.ok(!e.isSymbolicLink());return e.isDirectory()?walk(f):[f];});}
const files=walk(root);let linkCount=0,anchorCount=0;
const markdownCache=new Map();
function markdown(file){
 if(markdownCache.has(file))return markdownCache.get(file);
 const source=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');
 // Code fences contain examples, not navigable headings or links. Keep line numbers intact.
 let fence;const prose=source.split('\n').map(line=>{
  const marker=/^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  if(fence){if(marker&&marker[1][0]===fence[0]&&marker[1].length>=fence.length&&!marker[2].trim())fence=undefined;return '';}
  if(marker){fence=marker[1];return '';}
  return line;
 }).join('\n');
 const anchors=new Set();
 for(const m of prose.matchAll(/^ {0,3}#{1,6}[ \t]+(.+)$/gm)){
  // GitHub-style IDs for the plain ATX headings used here, including Chinese headings and repeated titles.
  const slug=m[1].replace(/[ \t]+#+[ \t]*$/,'').trim().toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\s-]/gu,'').replace(/ /g,'-');
  let id=slug;for(let i=1;anchors.has(id);i++)id=slug+'-'+i;anchors.add(id);
 }
 const page={source,prose,anchors};markdownCache.set(file,page);return page;
}
const reachable=new Set();
function visit(f){
 if(reachable.has(f)) return;reachable.add(f);
 if(!f.endsWith('.md'))return;
 for(const m of markdown(f).prose.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)){
  const href=m[1];if(/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href))continue;
  const [rel,fragment]=href.split(/#(.*)/s);const t=rel?path.resolve(path.dirname(f),decodeURIComponent(rel)):f;
  const where=path.relative(root,f)+' → '+href;
  assert.ok(t.startsWith(root+path.sep)&&fs.statSync(t,{throwIfNoEntry:false})?.isFile(),where);
  if(fragment){assert.ok(t.endsWith('.md')&&markdown(t).anchors.has(decodeURIComponent(fragment)),'无效锚点: '+where);anchorCount++;}
  linkCount++; visit(t);
 }
}
visit(path.join(root,'SKILL.md'));
for(const f of files.filter(f=>f.startsWith(path.join(root,'references')+path.sep)))assert.ok(reachable.has(f),'入口无法到达 '+f);
for(const f of files.filter(f=>f.endsWith('.md'))) visit(f);
assert.equal(files.some(f=>/\.(mjs|js|py|ts|tap)$/.test(f)),false,'模型包不应分发程序');
function run(rows, runtime=env){
 const pass=[];const gate=new NDJSONReplyStream({session:new ReplySession({env:runtime}),onMessage:(m)=>pass.push(m)});
 for(const row of rows){const res=gate.push(Buffer.from(JSON.stringify(row)+'\n'));assert.ok(res.every(v=>v.valid),JSON.stringify(res));}
 assert.deepEqual(gate.finish().valid,true);assert.deepEqual(pass,rows);
}
const base=(components,data,runtime=env)=>{
 const surfaceId='release-verify',m=[{version:'v0.9',createSurface:{surfaceId,catalogId:runtime.profile.catalogId}}];
 if(Object.keys(data).length)m.push({version:'v0.9',updateDataModel:{surfaceId,path:'/',value:data}});
 m.push({version:'v0.9',updateComponents:{surfaceId,components}});return m;
};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'agenui-lean-verify-'));
try{
 const ap={...profile,components:Object.keys(env.catalog.components)};const pp=path.join(tmp,'all.json');fs.writeFileSync(pp,JSON.stringify(ap));const all=loadCatalog(pp);
 const fixtureIndex=JSON.parse(fs.readFileSync(path.join(validatorRoot,'generated/visual-index.json'),'utf8'));
 const dir=path.join(root,'references/components');
 const families=['layout','content','inputs','navigation','media','extensions'].map(n=>n+'.md');
 assert.deepEqual(fs.readdirSync(dir).sort(),['index.md',...families].sort(),'组件目录应恰有一个索引和六个分册');
 const sections=new Map(),known=Object.keys(env.catalog.components).sort();
 assert.deepEqual(fixtureIndex.components.map(v=>v.component).sort(),known,'视觉模板必须覆盖有效 Catalog 的每个组件');
 for(const family of families){
  const page=markdown(path.join(dir,family));const lines=page.source.split('\n');const headings=[];
  for(const [i,line] of page.prose.split('\n').entries())if(/^## /.test(line))headings.push({i,name:line.slice(3).trim()});
  assert.ok(headings.length,'空分册: '+family);
  for(const [k,{i,name}] of headings.entries()){
   assert.ok(known.includes(name)&&!sections.has(name),'未知或重复组件章节: '+name);
   const body=lines.slice(i+1,headings[k+1]?.i??lines.length).join('\n');
   sections.set(name,{body,href:family+'#'+name.toLowerCase()});
  }
 }
 assert.deepEqual([...sections.keys()].sort(),known,'分册章节必须完整覆盖 Catalog');
 const indexed=[];for(const row of markdown(path.join(dir,'index.md')).prose.split('\n').filter(line=>/^\|\[/.test(line))){
  const m=/^\|\[([^\]]+)\]\(([^)]+)\)\|/.exec(row);assert.ok(m,'无效索引行: '+row);
  assert.equal(m[2],sections.get(m[1])?.href,'组件索引未准确链接到 '+m[1]+' 章节');indexed.push(m[1]);
 }
 assert.deepEqual(indexed.sort(),known,'索引必须为每个组件恰好提供一个链接');
 let variants=0,blocks=0;const rejectedOptional=new Set();
 for(const spec of fixtureIndex.components){
  const doc=sections.get(spec.component).body,seen=[],uniqueBlocks=new Set();
  const matched=[...doc.matchAll(/^#### ([^\n]+)\n\n```json\n([\s\S]*?)\n```$/gm)];
  assert.ok(matched.length,spec.component+' 没有模板');
  assert.equal(matched.length,[...doc.matchAll(/^#### /gm)].length,spec.component+' 模板标题缺少片段');
  assert.equal(matched.length,[...doc.matchAll(/^```json$/gm)].length,spec.component+' 出现无标题片段');
  const runtime=profile.components.includes(spec.component)?env:all;
  for(const match of matched){
   const snippet=JSON.parse(match[2]);blocks++;
   for(const variant of match[1].split(' / ')){
    const e=expandTemplate(spec.component,variant);
    const expected={...(Object.keys(e.initialData).length?{initialData:e.initialData}:{}),components:[...e.dependencies,e.focus]};
    assert.deepEqual(snippet,expected,spec.component+'.'+variant+' 内容偏离原模板');
    uniqueBlocks.add(JSON.stringify(expected));
    const nodes=[...snippet.components,{id:'root',component:'Column',children:[e.focus.id]}];
    run(base(nodes,e.initialData,runtime),runtime);
    if(runtime===all&&!rejectedOptional.has(spec.component)){
     const session=new ReplySession({env});let last;for(const m of base(nodes,e.initialData))last=session.accept(m);
     assert.ok(last.diagnostics.some(d=>d.code==='E_COMPONENT'));rejectedOptional.add(spec.component);
    }
    variants++;seen.push(variant);
   }
  }
  assert.deepEqual(seen.sort(),spec.variants.slice().sort(),spec.component+' 的变体列表不完整或重复');
  assert.equal(matched.length,uniqueBlocks.size,spec.component+' 的相同模板应共享标题');
 }
 assert.deepEqual([...rejectedOptional].sort(),known.filter(name=>!profile.components.includes(name)));
 let functions=0;const names=[],exampleCalls=[];
 for(const file of ['builtin','custom']){
  const doc=read('references/functions/'+file+'.md');
  for(const m of doc.matchAll(/^\|\x60(\w+)\x60\|/gm))names.push(m[1]);
  for(const m of doc.matchAll(/```json\n([\s\S]*?)\n```/g)){
   const ex=JSON.parse(m[1]);exampleCalls.push(ex.call);assert.ok(env.fn(ex.call)(ex));let nodes=[],data={};
   if(ex.call==='and'){
    data={form:{email:'sample@example.invalid'}};nodes=[{id:'f',component:'TextField',label:'邮箱',value:{path:'/form/email'},checks:[{condition:ex,message:'请输入邮箱'}]}];
   }else if(ex.call==='formatCurrency'||ex.call==='formatNumber'){
    data={plan:{amount:20},form:{perPerson:250}};nodes=[{id:'f',component:'Text',text:ex}];
   }else if(ex.call==='sendMsgToXiaoyi'){
    data={form:{perPerson:250}};nodes=[{id:'txt',component:'Text',text:'提交'},{id:'f',component:'Button',child:'txt',action:{functionCall:ex}}];
   }else throw Error('新增函数示例需指定实际使用位置');
   run(base([...nodes,{id:'root',component:'Column',children:['f']}],data));functions++;
  }
 }
 assert.deepEqual(names.sort(),Object.keys(env.catalog.functions).sort());
 for(const call of ['and','formatCurrency','formatNumber','sendMsgToXiaoyi'])assert.ok(exampleCalls.includes(call),'缺少真实字段示例: '+call);
 // Preserve the raw wire bytes: duplicate keys or a truncated JSON line must not vanish in a parse/re-serialize step.
 function runWire(text){
  const accepted=[];const gate=new NDJSONReplyStream({session:new ReplySession({env}),onMessage:m=>accepted.push(m)});
  const bytes=Buffer.from(text);for(let i=0;i<bytes.length;i+=97){
   const chunk=gate.push(bytes.subarray(i,i+97));assert.ok(chunk.every(x=>x.valid),JSON.stringify(chunk));
  }
  const end=gate.finish();assert.ok(end.valid,JSON.stringify(end));assert.ok(accepted.length>0);
 }
 const protocolExamples=[...read('references/protocol.md').matchAll(/```ndjson\n([\s\S]*?)\n```/g)];assert.ok(protocolExamples.length);
 for(const m of protocolExamples)runWire(m[1]+'\n');
 const samples=fs.readdirSync(path.join(root,'references/examples'));
 for(const f of ['concert-append.ndjson','portion-planner.ndjson','text-field-number.ndjson'])assert.ok(samples.includes(f),'缺少完整用例: '+f);
 for(const f of samples)runWire(read('references/examples/'+f));
 console.log(JSON.stringify({modelFiles:files.length,internalLinks:linkCount,markdownAnchors:anchorCount,componentBooklets:families.length,componentIndexTargets:indexed.length,components:fixtureIndex.components.length,templateNames:variants,uniqueTemplateBlocks:blocks,defaultRejects:[...rejectedOptional],functionSignatures:names.length,functionExamplesInRealFields:functions,completeStreams:samples.length,protocolExampleChecked:true,contractSha256:stamp.contractSha256}));
} finally{fs.rmSync(tmp,{recursive:true,force:true});}
