#!/usr/bin/env node
// 复用指定宿主的 loadCatalog(profile)，包括项目 vp 单位 overlay；不改 vendor。
// 只做离线校验，不执行控件、表达式、媒体访问或任何业务动作。
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
const {values}=parseArgs({options:{skill:{type:'string'},pack:{type:'string'}}});
if(!values.skill) throw new Error('用法：node scripts/validate.mjs --skill /path/to/agenui-reply [--pack /path/to/pack]');
const skill=path.resolve(values.skill), pack=path.resolve(values.pack||path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
const {validateMessages,parseMessages}=await import(pathToFileURL(path.join(skill,'scripts/lib/validator.mjs')));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const dp=path.join(pack,'validation/default-profile.json'), ep=path.join(pack,'validation/catalog-all25-profile.json');
const expected=read(path.join(pack,'templates/index.json')).components;
const results=[];
function check(name,msgs,profile){
 const res=validateMessages(msgs,{surface:'new',profile});
 const refs=[];
 for(const m of msgs) for(const n of m.updateComponents?.components||[]) {
   // No template metadata is allowed into actual payloads.
   if('templateId' in n||'styleTemplate' in n) refs.push('unexpected template metadata');
 }
 const item={name,valid:res.valid&&!refs.length,messages:msgs.length,diagnostics:res.diagnostics,extra:refs};results.push(item);return item;
}
for(const item of expected){
 const raw=fs.readFileSync(path.join(pack,'examples/harmony-candidate',item.name+'.jsonl'),'utf8');
 const parsed=parseMessages(raw,'ndjson');
 if(parsed.diagnostics.length){results.push({name:item.name,valid:false,diagnostics:parsed.diagnostics});continue;}
 const profile=item.conditional?ep:dp;
 check(item.name,parsed.messages,profile);
 const tpl=read(path.join(pack,'templates',item.name+'.json'));
 for(const [variant,change] of Object.entries(tpl.variants)){
  const msgs=structuredClone(parsed.messages);
  for(const m of msgs) for(const n of m.updateComponents?.components||[]){
    const overlay=n.id===tpl.focus.id?change.focus:change.nodes?.[n.id];
    if(!overlay)continue;
    for(const [key,v] of Object.entries(overlay))n[key]=key==='styles'?{...n.styles,...v}:structuredClone(v);
  }
  if(item.name==='TextField'&&variant==='numberDraft')for(const m of msgs)if(m.updateDataModel)m.updateDataModel.value.form.name='3';
  check(item.name+'/'+variant,msgs,profile);
 }
}
for(const fname of ['hotpot_composition.ndjson','unit_calibration.ndjson']){
 const parsed=parseMessages(fs.readFileSync(path.join(pack,'examples',fname),'utf8'),'ndjson');
 check(fname,parsed.messages,dp);
}
const guard=[];
for(const name of ['Chart','Markdown','Lottie']){
 const parsed=parseMessages(fs.readFileSync(path.join(pack,'examples/harmony-candidate',name+'.jsonl'),'utf8'),'ndjson');
 const r=validateMessages(parsed.messages,{surface:'new',profile:dp});
 guard.push({name,defaultProfileRejects:!r.valid&&r.diagnostics.some(x=>x.code==='E_COMPONENT')});
}
const report={time:new Date().toISOString(),basis:'指定 agenui-reply 的 loadCatalog(profile) 有效 Schema，包含用户确认的项目 vp 单位 overlay；上游 vendor 原文保持不变',
 checks:results.length,passed:results.filter(x=>x.valid).length,failed:results.filter(x=>!x.valid).length,results,profileGuards:guard,
 unitContract:{unit:'vp',unitlessDefault:'vp',valueType:'string',semanticsConfirmed:true,basis:'用户确认当前端侧支持vp，尺寸字符串无单位默认vp；不是官方上游能力声明'},
 untested:['HarmonyOS SDK 真机视觉','vp与无单位尺寸字符串的真机显示等价性','系统大字体与无障碍缩放','原生控件内主题覆盖','鼠标/触控/键盘事件','媒体资源加载（含example.invalid离线fixture替换后的真实资源）','动作实际发送','完整线上流式恢复','外部网页视觉']};
fs.writeFileSync(path.join(pack,'validation/schema-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checks:report.checks,passed:report.passed,failed:report.failed,failures:results.filter(x=>!x.valid),profileGuards:guard},null,2));
process.exitCode=report.failed||guard.some(x=>!x.defaultProfileRejects)?1:0;
