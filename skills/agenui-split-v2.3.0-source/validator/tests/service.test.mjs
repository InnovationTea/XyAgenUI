import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createValidatorServer } from '../scripts/service.mjs';
import { fixedCatalogId } from '../scripts/lib/catalog.mjs';

async function listen(t,options = {}) {
  const server = createValidatorServer(options);
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const base='http://127.0.0.1:'+server.address().port;
  async function http(path,method='GET',body,ct) {
    const res=await fetch(base+path,{method,headers:ct?{'Content-Type':ct}:undefined,body});
    return {status:res.status,body:res.status===204?null:await res.json()};
  }
  const create=(s,extra={})=>http('/v1/sessions','POST',JSON.stringify({surfaceId:s,...extra}),'application/json');
  const chunks=(id,seq,body)=>http('/v1/sessions/'+id+'/chunks/'+seq,'POST',body,'application/octet-stream');
  const finish=(id,seq)=>http('/v1/sessions/'+id+'/finish/'+seq,'POST');
  return {http,create,chunks,finish};
}
function data(surfaceId) {
  const create={version:'v0.9',createSurface:{surfaceId,catalogId:fixedCatalogId}};
  const region={version:'v0.9',updateComponents:{surfaceId,components:[
    {id:'title',component:'Text',text:'周末采购🥘',styles:{'font-size':'16vp'}},
    {id:'root',component:'Column',children:['title']}
  ]}};
  return {create,region};
}
const line=o=>Buffer.from(JSON.stringify(o)+'\n','utf8');
test('HTTP: 校验版本匹配、UTF-8跨分片、有效区域早于finish且保留无换行尾条',async t=>{
  const a=await listen(t); const sid='plan-a';const {create,region}=data(sid);
  const health=await a.http('/healthz'); assert.match(health.body.contractSha256,/^[0-9a-f]{64}$/);
  assert.equal((await a.create(sid,{expectedContractSha256:'different'})).status,409);
  const start=await a.create(sid,{expectedContractSha256:health.body.contractSha256});
  assert.equal(start.status,201); assert.equal(start.body.nextSeq,1);const id=start.body.sessionId;
  const raw=line(region);const split=raw.indexOf(Buffer.from('周'))+1;
  const r1=await a.chunks(id,1,Buffer.concat([line(create),raw.subarray(0,split)]));
  assert.deepEqual(r1.body.accepted,[{sequence:1,message:create}]);assert.equal(r1.body.nextSeq,2);
  const r2=await a.chunks(id,2,raw.subarray(split));assert.deepEqual(r2.body.accepted,[{sequence:2,message:region}]);
  const late={version:'v0.9',updateDataModel:{surfaceId:sid,path:'/later',value:'就绪'}};
  assert.deepEqual((await a.chunks(id,3,JSON.stringify(late))).body.accepted,[]);
  const f=await a.finish(id,4);assert.equal(f.status,200);assert.deepEqual(f.body.accepted,[{sequence:3,message:late}]);
  assert.equal(f.body.acceptedCount,3);assert.equal((await a.finish(id,4)).status,404);
});
test('HTTP: 同分片有效前缀仅释放一次，即使后续JSON或UTF-8出错',async t=>{
  const a=await listen(t);
  for(const bad of [Buffer.from('{"broken":}\n'),Buffer.from([0xff,0x0a])]){
    const sid='prefix';const start=await a.create(sid);const id=start.body.sessionId;const {create,region}=data(sid);
    const r=await a.chunks(id,1,Buffer.concat([line(create),line(region),bad,line(region)]));
    assert.equal(r.status,422);assert.equal(r.body.valid,false);
    assert.deepEqual(r.body.accepted,[{sequence:1,message:create},{sequence:2,message:region}]);
    assert.equal(r.body.acceptedCount,2);assert.ok(r.body.diagnostics.length>0);
    assert.equal((await a.chunks(id,1,line(create))).status,404);
  }
});
test('HTTP: 乱序与重送不重复交付；会话隔离；超时清除且不自动续建',async t=>{
  let now=1000;const a=await listen(t,{clock:()=>now,limits:{maxSessions:2,idleMs:1000}});
  const x=(await a.create('x')).body.sessionId;const y=(await a.create('y')).body.sessionId;
  assert.equal((await a.create('z')).status,429);
  const m=data('x').create;
  const early=await a.chunks(x,2,line(m));assert.equal(early.status,409);assert.deepEqual(early.body.accepted,[]);
  const dup=await Promise.all([a.chunks(x,1,line(m)),a.chunks(x,1,line(m))]);
  assert.deepEqual(dup.map(r=>r.status).sort(),[200,409]);assert.equal(dup.flatMap(r=>r.body.accepted).length,1);
  const cross=await a.chunks(y,1,line(m));assert.equal(cross.status,422);
  assert.equal(cross.body.diagnostics[0].code,'E_REPLY_SURFACE');
  now+=1001;assert.equal((await a.finish(x,2)).status,404);
  const z=(await a.create('z')).body.sessionId;assert.equal((await a.http('/v1/sessions/'+z,'DELETE')).status,204);
  assert.equal((await a.chunks(z,1,line(data('z').create))).status,404);
});
test('HTTP: 请求体类型和大小错误不推进序号；finish仍检查缺失root',async t=>{
  const a=await listen(t,{limits:{maxChunkBytes:1024}});const id=(await a.create('x')).body.sessionId;
  const p='/v1/sessions/'+id+'/chunks/1';
  assert.equal((await a.http(p,'POST','{}','application/json')).status,415);
  assert.equal((await a.chunks(id,1,Buffer.alloc(1025,65))).status,413);
  assert.equal((await a.chunks(id,1,line(data('x').create))).status,200);
  const f=await a.finish(id,2);assert.equal(f.status,422);assert.equal(f.body.diagnostics[0].code,'E_ROOT');
});
