#!/usr/bin/env node
// Internal HTTP transport. All A2UI acceptance decisions remain in the validator core.
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { parseJsonStrict } from './lib/json.mjs';
import { loadCatalog, contractStamp, ReplySession, NDJSONReplyStream } from './lib/index.mjs';

const defaults = {
  maxSessions: 32, idleMs: 60_000, lifetimeMs: 300_000, bodyMs: 10_000,
  maxChunkBytes: 65536, maxStreamBytes: 4 * 1024 * 1024, maxConnections: 128
};
const err = (status, code, message, extra = {}) => Object.assign(new Error(message), { status, code, extra });
const basicDiag = (code, message) => ({ code, message });
function media(req, wanted) {
  const type = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (type !== wanted || (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity'))
    throw err(415, 'E_MEDIA_TYPE', '需要 ' + wanted + '，请求体不能压缩');
}
function readBody(req, cap, timeout) {
  if (Number(req.headers['content-length'] || 0) > cap)
    throw err(413,'E_HTTP_BODY_LIMIT','单个HTTP请求体超限；该请求未被校验器消费');
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    const timer = setTimeout(() => stop(err(408, 'E_BODY_TIMEOUT','请求体读取超时')), timeout);
    const cleanup = () => {
      clearTimeout(timer); req.off('data', data); req.off('end', end); req.off('error', lost); req.off('aborted', lost);
    };
    function stop(error) { cleanup(); req.resume(); reject(error); }
    function data(chunk) {
      size += chunk.length;
      if (size > cap) return stop(err(413,'E_HTTP_BODY_LIMIT','单个HTTP请求体超限；该请求未被校验器消费'));
      chunks.push(chunk);
    }
    function end() { cleanup(); resolve(Buffer.concat(chunks,size)); }
    function lost() { stop(err(400,'E_REQUEST_INTERRUPTED','未收到完整请求体')); }
    req.on('data', data); req.once('end',end); req.once('aborted',lost); req.once('error',lost);
  });
}
function send(res, status, body) {
  if (res.destroyed || res.writableEnded) return;
  const bytes = body == null ? null : Buffer.from(JSON.stringify(body));
  res.writeHead(status, { 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
    ...(bytes ? {'Content-Type':'application/json; charset=utf-8','Content-Length':bytes.length} : {}) });
  res.end(bytes);
}
const pathPattern = /^\/v1\/sessions\/([0-9a-f-]{36})(?:\/(chunks|finish)\/([1-9][0-9]{0,8}))?$/;

export function createValidatorServer(options = {}) {
  const limits = {...defaults, ...options.limits};
  for (const [key,v] of Object.entries(limits))
    if (!Object.hasOwn(defaults,key) || !Number.isSafeInteger(v) || v < 1) throw new Error('不合法的HTTP限制参数：'+key);
  const env = options.env ?? loadCatalog();
  const { contractSha256 } = contractStamp(env);
  const sessions = new Map();
  const clock = options.clock || Date.now;
  const drop = id => { const s = sessions.get(id); if(s) { s.stream.abort(); sessions.delete(id); } };
  const expired = (s,t) => t-s.last >= limits.idleMs || t-s.born >= limits.lifetimeMs;
  function sweep() { const t=clock(); for (const [id,s] of sessions) if (expired(s,t)) drop(id); }
  function lookup(id) {
    const s = sessions.get(id);
    if (!s || expired(s,clock())) { if (s) drop(id); throw err(404,'E_SESSION','会话不存在、已结束或已过期'); }
    return s;
  }
  function checkSeq(s,seq) {
    if (seq !== s.nextSeq) throw err(409,'E_SEQUENCE','请求顺序不符；本请求未消费，也不会重发此前已交付的消息',{nextSeq:s.nextSeq});
  }
  async function handle(req,res) {
    const url = req.url;
    if (req.method === 'GET' && url === '/healthz') return send(res,200,{status:'ok',contractSha256});
    if (req.method === 'POST' && url === '/v1/sessions') {
      media(req,'application/json');
      const data = await readBody(req,2048,limits.bodyMs);
      let body;
      try { body = parseJsonStrict(new TextDecoder('utf-8',{fatal:true}).decode(data),{maxBytes:2048,maxDepth:4}); }
      catch { throw err(400,'E_SESSION_REQUEST','需要有效的UTF-8 JSON对象'); }
      if (!body || Array.isArray(body) || typeof body!=='object' ||
          Object.keys(body).some(k => !['surfaceId','expectedContractSha256'].includes(k)) ||
          typeof body.surfaceId!=='string' || !body.surfaceId.trim() || Buffer.byteLength(body.surfaceId)>128 ||
          /[\u0000-\u001f\u007f]/u.test(body.surfaceId))
        throw err(400,'E_SESSION_REQUEST','请提供非空surfaceId（最多128字节），可选expectedContractSha256');
      if (body.expectedContractSha256 !== undefined && body.expectedContractSha256 !== contractSha256)
        throw err(409,'E_CONTRACT','Skill与校验器契约不一致',{contractSha256});
      sweep();
      if (sessions.size >= limits.maxSessions) throw err(429,'E_CAPACITY','并发会话数已达上限');
      const id=randomUUID(); const t=clock();
      const session = new ReplySession({env,surface:'new',surfaceId:body.surfaceId});
      const s = {session,nextSeq:1,bytes:0,born:t,last:t,accepted:[]};
      s.stream = new NDJSONReplyStream({session,onMessage:(message,sequence)=>{s.accepted.push({sequence,message});}});
      sessions.set(id,s);
      return send(res,201,{sessionId:id,contractSha256,nextSeq:s.nextSeq});
    }
    const m = pathPattern.exec(url);
    if (!m) throw err(404,'E_ROUTE','未知接口');
    const [,id,op,rawSeq] = m;
    if (req.method==='DELETE' && !op) {
      await readBody(req,0,limits.bodyMs); lookup(id); drop(id); return send(res,204);
    }
    if (req.method!=='POST' || !op) throw err(405,'E_METHOD','HTTP方法不匹配');
    const seq=Number(rawSeq);
    // Check again after asynchronous reads: only one of two competing requests can commit this seq.
    checkSeq(lookup(id),seq);
    if(op==='chunks') media(req,'application/octet-stream');
    const data=await readBody(req, op==='chunks' ? limits.maxChunkBytes : 0, limits.bodyMs);
    const s=lookup(id); checkSeq(s,seq);
    const reply=(result,terminal) => {
      const accepted=s.accepted.splice(0);
      const payload={valid:result.valid,accepted,acceptedCount:s.session.acceptedCount};
      if (!result.valid) payload.diagnostics=result.diagnostics;
      if (terminal) drop(id); else { s.last=clock(); payload.nextSeq=++s.nextSeq; }
      send(res,result.valid ? 200 : 422,payload);
    };
    try {
      if(op==='finish') return reply(s.stream.finish(),true);
      if (!data.length) throw err(400,'E_CHUNK_EMPTY','空分片未消费；结束请调用finish');
      if (s.bytes+data.length>limits.maxStreamBytes)
        return reply({valid:false,diagnostics:[basicDiag('E_STREAM_BYTES','会话累计字节超限，本次分片未消费')]},true);
      s.bytes+=data.length;
      // Byte-split only at ASCII LF. Ensures malformed UTF-8 later in a chunk
      // cannot erase valid lines already accepted from that very same HTTP request.
      for(let pos=0;pos<data.length;) {
        const lf=data.indexOf(10,pos); const end=lf<0?data.length:lf+1;
        const bad=s.stream.push(data.subarray(pos,end)).find(r=>!r.valid);
        if(bad) return reply(bad,true);
        pos=end;
      }
      return reply({valid:true},false);
    } catch(e) { if(!e.status) drop(id); throw e; }
  }
  const server=http.createServer({requestTimeout:limits.bodyMs+1000,headersTimeout:limits.bodyMs,keepAliveTimeout:5000},(req,res)=>{
    // Avoid unhandled late stream errors if an oversized/aborted request is discarded.
    req.on('error',()=>{});
    handle(req,res).catch(e=>{
      req.resume();
      send(res,e.status||500,{valid:false,accepted:[],diagnostics:[basicDiag(e.code&&e.status?e.code:'E_INTERNAL',e.status?e.message:'服务异常；请结束本轮处理')],...e.extra});
    });
  });
  server.maxConnections=limits.maxConnections;
  const timer=setInterval(sweep,Math.min(15_000,limits.idleMs,limits.lifetimeMs));timer.unref();
  server.once('close',()=>{clearInterval(timer);for(const id of sessions.keys())drop(id);});
  return server;
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href===import.meta.url) {
  const host=process.env.HOST ?? '127.0.0.1', port=Number(process.env.PORT ?? 8080);
  if (!Number.isInteger(port)||port<1||port>65535) throw new Error('PORT必须为1–65535');
  const server=createValidatorServer();
  server.listen(port,host,()=>console.log('Validator HTTP listening on '+host+':'+port));
  const stop=()=>{ server.close();server.closeIdleConnections(); };
  process.once('SIGTERM',stop);process.once('SIGINT',stop);
}
