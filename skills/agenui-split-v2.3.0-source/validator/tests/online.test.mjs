import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { loadCatalog, validatorRoot } from '../scripts/lib/catalog.mjs';
import { parseJsonStrict } from '../scripts/lib/json.mjs';
import { ReplySession, NDJSONReplyStream } from '../scripts/lib/session.mjs';
import { validateMessages } from '../scripts/lib/validator.mjs';
const env=loadCatalog();
const create={version:'v0.9',createSurface:{surfaceId:'s',catalogId:env.profile.catalogId}};
const data=(path,value)=>({version:'v0.9',updateDataModel:{surfaceId:'s',path,value}});
const text=(id='a')=>({id,component:'Text',text:'中文🥘与转义"内容'});
const root=(children=['a'])=>({id:'root',component:'Column',children,styles:{gap:'16px'}});
const update=nodes=>({version:'v0.9',updateComponents:{surfaceId:'s',components:nodes}});
const initial=[create,update([text(),root()])];
const streamText=initial.map(m=>JSON.stringify(m)).join('\n')+'\n';
const accept=(s,m)=>{const r=s.accept(m);assert.deepEqual(r.diagnostics,[]);return r;};
const session=()=>new ReplySession({env,surfaceId:'s'});

test('严格JSON拒绝重复键，包括转义后等价键',()=>{
 for(const raw of ['{"a":1,"a":2}','{"a":1,"\\u0061":2}','{"x":{"a":1,"a":2}}'])assert.throws(()=>parseJsonStrict(raw),e=>e.code==='E_DUPLICATE_KEY');
 assert.deepEqual(parseJsonStrict('{"x":{"a":1},"y":{"a":2}}'),{x:{a:1},y:{a:2}});
});
test('严格JSON接受转义、空结构、指数、null；拒绝非有限数与多余文本',()=>{
 for(const s of ['{"x":"a\\\"b\\n"}','[]','{}','-1.5e+3','null','true'])assert.deepEqual(parseJsonStrict(s),JSON.parse(s));
 for(const s of ['1e400','[NaN]','{}{}','{"x":1,}','[1,]'])assert.throws(()=>parseJsonStrict(s));
});
test('JSON深度和消息字节数有明确上限',()=>{
 assert.throws(()=>parseJsonStrict('[[[1]]]',{maxDepth:2}),e=>e.code==='E_LIMIT');
 assert.throws(()=>parseJsonStrict('{"x":"中文"}',{maxBytes:8}),e=>e.code==='E_LIMIT');
});
test('前置建面和数据可接受；没有root只在结束时报错',()=>{
 const s=session();accept(s,create);accept(s,data('/form/n',3));assert.ok(s.finish().diagnostics.some(d=>d.code==='E_ROOT'));
});
test('完整消息尚未结束时保持缓冲而非误报语法',()=>{
 const seen=[],g=new NDJSONReplyStream({session:session(),onMessage:m=>seen.push(m)});
 assert.deepEqual(g.push(JSON.stringify(create).slice(0,10)),[]);assert.equal(seen.length,0);
 assert.ok(g.push(JSON.stringify(create).slice(10)+'\n')[0].valid);assert.equal(seen.length,1);
});
test('单字节UTF-8分片覆盖中文和emoji，与整体消息完全一致',()=>{
 const seen=[],g=new NDJSONReplyStream({session:session(),onMessage:m=>seen.push(m)});
 for(const byte of Buffer.from(streamText))assert.ok(g.push(Uint8Array.of(byte)).every(r=>r.valid));
 assert.ok(g.finish().valid);assert.deepEqual(seen,initial);
});
test('所有字符串切分位置都产生相同结果',()=>{
 for(let cut=0;cut<=streamText.length;cut++){
  const seen=[],g=new NDJSONReplyStream({session:session(),onMessage:m=>seen.push(m)});
  g.push(streamText.slice(0,cut));g.push(streamText.slice(cut));assert.ok(g.finish().valid);assert.deepEqual(seen,initial);
 }
});
test('支持CRLF与起始BOM，多个消息位于同一chunk',()=>{
 const seen=[],g=new NDJSONReplyStream({session:session(),onMessage:m=>seen.push(m)});
 assert.ok(g.push('\uFEFF'+streamText.replaceAll('\n','\r\n')).every(r=>r.valid));assert.ok(g.finish().valid);assert.deepEqual(seen,initial);
});
test('正常EOF可以接完整尾行，严格模式拒绝缺最后换行',()=>{
 const g=new NDJSONReplyStream({session:session()});g.push(streamText.trimEnd());assert.ok(g.finish().valid);
 const strict=new NDJSONReplyStream({session:session(),requireFinalNewline:true});strict.push(streamText.trimEnd());assert.equal(strict.finish().valid,false);
});
test('截断尾部拒绝，不自动补括号',()=>{
 const g=new NDJSONReplyStream({session:session()});g.push(JSON.stringify(create)+'\n{"version":');assert.equal(g.finish().valid,false);
});
test('单行顶层数组和代码围栏不进入renderer',()=>{
 for(const raw of [JSON.stringify(initial)+'\n','```json\n'+streamText]){
  const seen=[],g=new NDJSONReplyStream({session:session(),onMessage:m=>seen.push(m)});
  assert.ok(g.push(raw).some(r=>!r.valid));assert.equal(seen.length,0);
 }
});
test('坏行之前的合法区域保留，后续消息阻断',()=>{
 const seen=[],g=new NDJSONReplyStream({session:session(),onMessage:m=>seen.push(m)});
 const results=g.push(streamText+'{"x":1,"x":2}\n'+JSON.stringify(data('/unused',1))+'\n');
 assert.ok(results.some(r=>!r.valid));assert.deepEqual(seen,initial);assert.equal(g.finish().valid,false);
});
test('同一会话不接受混合bytes/string；坏UTF-8拒绝',()=>{
 const g=new NDJSONReplyStream({session:session()});g.push(Buffer.from('{'));assert.ok(g.push('}').some(r=>!r.valid));
 const h=new NDJSONReplyStream({session:session()});assert.ok(h.push(Buffer.from([0xff])).some(r=>!r.valid));
});
test('终止不执行未闭合尾行，终止后不接收',()=>{
 const seen=[],g=new NDJSONReplyStream({session:session(),onMessage:m=>seen.push(m)});
 g.push(JSON.stringify(create));g.abort();assert.equal(seen.length,0);assert.ok(g.push('\n').some(r=>!r.valid));
});
test('错误候选不污染已接受组件和数据，可提交修复候选',()=>{
 const s=session();initial.forEach(m=>accept(s,m));const before=s.snapshot();
 assert.equal(s.accept(update([{id:'b',component:'Card',child:'missing'},root(['a','b'])])).valid,false);
 assert.deepEqual(s.snapshot(),before);assert.equal(s.acceptedCount,2);
 accept(s,update([text('b'),root(['a','b'])]));assert.ok(s.finish().valid);
});
test('数据变更导致已绑定值类型错误时拒绝且不污染快照',()=>{
 const s=session();accept(s,create);accept(s,data('/display','ok'));
 accept(s,update([{id:'a',component:'Text',text:{path:'/display'}},root()]));
 assert.equal(s.accept(data('/display',5)).valid,false);assert.equal(s.snapshot().get('s').data.display,'ok');
});
test('首个组件批必须包含可达root，孤立节点拒绝',()=>{
 for(const nodes of [[text()],[text(),text('orphan'),root()]]){
  const s=session();accept(s,create);assert.equal(s.accept(update(nodes)).valid,false);
 }
});
test('后批root不能删区、重排或改变既有样式',()=>{
 const s=session();initial.forEach(m=>accept(s,m));accept(s,update([text('b'),root(['a','b'])]));
 for(const n of [root(['b']),root(['b','a']),{...root(['a','b']),styles:{gap:'32px'}}])assert.equal(s.accept(update([n])).valid,false);
});
test('子节点先于父节点、root最后、已显示非root不可重定义',()=>{
 let s=session();accept(s,create);assert.equal(s.accept(update([root(),text()])).valid,false);
 s=session();initial.forEach(m=>accept(s,m));assert.equal(s.accept(update([text(),root()])).valid,false);
});
test('初值按路径追加，禁止覆盖可见输入及整个根',()=>{
 const s=session();accept(s,create);accept(s,data('/form/n',3));
 accept(s,update([{id:'n',component:'Slider',min:1,max:10,value:{path:'/form/n'}},root(['n'])]));
 accept(s,data('/form/needs',[]));
 assert.equal(s.accept(data('/form',{n:2})).valid,false);
 const noPath=data('/',{});delete noPath.updateDataModel.path;assert.equal(s.accept(noPath).valid,false);
 assert.equal(s.snapshot().get('s').data.form.n,3);
});
test('动态可编辑列表保护相对路径及整个列表，空列表也保护',()=>{
 for(const rows of [[],[{name:'牛肉',done:false}]]){
  const s=session();accept(s,create);accept(s,data('/items',rows));
  accept(s,update([{id:'check',component:'CheckBox',label:'已采购',value:{path:'done'}},{id:'list',component:'List',children:{path:'/items',componentId:'check'}},root(['list'])]));
  assert.equal(s.accept(data('/items',[{name:'牛肉',done:true}])).valid,false);
 }
});
test('不同Surface与普通生成delete被拒绝',()=>{
 const s=session();initial.forEach(m=>accept(s,m));
 const m=data('/x',1);m.updateDataModel.surfaceId='other';assert.equal(s.accept(m).valid,false);
 assert.equal(s.accept({version:'v0.9',deleteSurface:{surfaceId:'s'}}).valid,false);
});
test('函数缺returnType报告真实字段而非无关union分支',()=>{
 const m=update([{id:'a',component:'Text',text:{call:'formatNumber',args:{value:{call:'calculateNumber',args:{left:1,right:2,operator:'add'}}}}},root()]);
 const res=validateMessages([create,m],{env,surface:'new'});
 assert.ok(res.diagnostics[0].message.includes('returnType'));assert.ok(res.diagnostics[0].pointer.endsWith('/returnType'));
});
test('消息和节点预算可配置，超过预算不提交',()=>{
 const s=new ReplySession({env,maxMessages:1});accept(s,create);assert.equal(s.accept(update([text(),root()])).valid,false);
 const h=new ReplySession({env,maxComponents:1});accept(h,create);assert.equal(h.accept(update([text(),root()])).valid,false);
});
test('回调异常不会导致无限递归或继续发送',()=>{
 const g=new NDJSONReplyStream({session:session(),onMessage(){throw new Error('queue failed');},onError(){throw new Error('log failed');}});
 const result=g.push(JSON.stringify(create)+'\n');assert.equal(result[0].valid,false);assert.ok(result[0].diagnostics.some(d=>d.code==='E_DELIVERY'));
});
test('CLI首批通过后在stdin EOF前即产生输出',async()=>{
 const child=spawn(process.execPath,['scripts/online.mjs','-'],{cwd:validatorRoot,stdio:['pipe','pipe','pipe']});
 let stdout='',stderr='';child.stderr.on('data',b=>stderr+=b);
 const ready=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('首批在EOF前没有返回')),5000);
  child.stdout.on('data',b=>{stdout+=b;if(stdout.split('\n').filter(Boolean).length>=2){clearTimeout(timer);resolve();}});
 });
 child.stdin.write(streamText);await ready;assert.equal(child.exitCode,null);child.stdin.end();
 const [code]=await once(child,'close');assert.equal(code,0,stderr);assert.equal(stdout,streamText);
});
test('新golden分批完整，动作参数仍为动态声明',()=>{
 const file=fs.readFileSync(path.join(validatorRoot,'fixtures/golden/portion-planner.ndjson'),'utf8');
 const accepted=[],g=new NDJSONReplyStream({session:new ReplySession({env}),onMessage:m=>accepted.push(m)});
 assert.ok(g.push(file).every(r=>r.valid));assert.ok(g.finish().valid);
 const button=accepted.flatMap(m=>m.updateComponents?.components||[]).find(n=>n.id==='submit');
 assert.deepEqual(button.action.functionCall.args.perPerson,{path:'/form/perPerson'});
});
