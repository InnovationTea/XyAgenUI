#!/usr/bin/env node
// Release tooling only. Generate to a private temp directory before touching published model assets.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {buildLeanComponents} from './lean-components.mjs';
import {buildLeanFunctions} from './lean-functions.mjs';
import {buildStyleFields} from './lean-style-fields.mjs';
import {validatorRoot} from './lib/catalog.mjs';

const {values,positionals}=parseArgs({allowPositionals:true, options:{check:{type:'boolean'},out:{type:'string'}}});
if(positionals.length>1||(values.out&&positionals.length)) throw Error('用法：node scripts/export-skill.mjs [--check] [--out 路径]');
const target=fs.realpathSync(path.resolve(values.out || positionals[0] || path.join(validatorRoot,'../agenui-reply-skill')));
if(!/^name:\s*agenui-reply\s*$/m.test(fs.readFileSync(path.join(target,'SKILL.md'),'utf8')))
 throw Error('目标必须是已有 agenui-reply 模型 Skill；不会创建或改写手写入口。');
const stage=fs.mkdtempSync(path.join(os.tmpdir(),'agenui-model-export-'));
const compact=fs.mkdtempSync(path.join(os.tmpdir(),'agenui-model-lean-'));
const managed=rel=>/^(?:references\/(?:components\/[a-zA-Z0-9_-]+\.md|functions\/(?:builtin|custom)\.md|examples\/[a-z0-9-]+\.ndjson|host-profile\.json|style-fields\.md)|generated\/contract-stamp\.json)$/.test(rel);
function walk(base,rel='') {
 const result=[];
 for(const e of fs.readdirSync(path.join(base,rel),{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
  const child=rel?rel+'/'+e.name:e.name;
  if(e.isDirectory())result.push(...walk(base,child));
  else if(e.isFile()||e.isSymbolicLink())result.push(child);
 }
 return result;
}
function safeDestination(rel) {
 if (!managed(rel) || rel.split('/').some(k=>!k||k==='.'||k==='..')) throw Error('不属于受管文件：'+rel);
 let p=target;
 for(const part of rel.split('/')){
  p=path.join(p,part); const st=fs.lstatSync(p,{throwIfNoEntry:false});
  if(st?.isSymbolicLink())throw Error('目标含符号链接，停止：'+rel);
 }
 return p;
}
function stageCopy(src,rel){
 const dst=path.join(stage,rel);fs.mkdirSync(path.dirname(dst),{recursive:true});
 fs.copyFileSync(path.join(validatorRoot,src),dst);
}
try{
 for(const file of ['build-resources.mjs','build-visuals.mjs','build-examples.mjs'])
  execFileSync(process.execPath,[path.join(validatorRoot,'scripts',file)],{env:{...process.env,AGENUI_PRIVATE_BUILD_STAGE:stage},cwd:validatorRoot,stdio:['ignore','ignore','inherit']});
 stageCopy('contract/profiles/default.json','capabilities/profiles/default.json');
 await buildLeanComponents({stage,out:compact});
 await buildLeanFunctions({stage,out:compact});
 buildStyleFields({stage,out:compact});
 const cp=(a,b)=>{const dst=path.join(compact,b);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(stage,a),dst);};
 cp('generated/contract-stamp.json','generated/contract-stamp.json');
 cp('capabilities/profiles/default.json','references/host-profile.json');
 for(const [folder,name] of [['golden','portion-planner'],['golden','concert-append'],['snippets','text-field-number']])
   cp('examples/'+folder+'/'+name+'.ndjson','references/examples/'+name+'.ndjson');
 const files=walk(compact).sort();
 for(const f of files)if(!managed(f))throw Error('精简导出器不应生成此路径：'+f);
 const legacy=['components','styles','capabilities','examples','generated/effective-catalog.json','generated/export-manifest.json','references/selection.md','references/interaction.md','references/streaming.md'].filter(f=>fs.existsSync(path.join(target,f)));
 if(legacy.length)throw Error('检测到 v2.1 旧目录。请在独立位置解压新版并整目录替换；不会自动删除既有文件：'+legacy.join(', '));
 const expected=new Set(files);
 // Handwritten folders/files outside the managed set are never deleted or replaced.
 // Stale generated names are reported explicitly; the maintainer reviews/removes them rather than silently losing files.
 const stale=walk(target).filter(f=>managed(f)&&!expected.has(f));
 const diff=[];
 for(const rel of files){
  const dst=safeDestination(rel), src=fs.readFileSync(path.join(compact,rel));
  if(!fs.existsSync(dst)||!fs.readFileSync(dst).equals(src))diff.push(rel);
 }
 if(stale.length) throw Error('目标含旧的受管文件（例如 v2.2 的组件单页）；安装时请整目录替换，维护时请审查并移除旧文件后再导出：'+stale.join(', '));
 if(!values.check)for(const rel of diff){
  const dst=safeDestination(rel);fs.mkdirSync(path.dirname(dst),{recursive:true});
  const tmp=dst+'.export-'+crypto.randomUUID();
  try{fs.copyFileSync(path.join(compact,rel),tmp);fs.renameSync(tmp,dst);}
  finally{fs.rmSync(tmp,{force:true});}
 }
 console.log(JSON.stringify({mode:values.check?'check':'export',checked:files.length,changed:diff.length,...(values.check&&diff.length?{drift:diff}:{})}));
 if(values.check&&diff.length)process.exitCode=1;
}finally{fs.rmSync(stage,{recursive:true,force:true});fs.rmSync(compact,{recursive:true,force:true});}
