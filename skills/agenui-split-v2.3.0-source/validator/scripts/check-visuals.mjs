import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadCatalog, readJson, validatorRoot } from './lib/catalog.mjs';
import { expandTemplate, loadVisualProfile, rootStyle } from './lib/styles.mjs';
import { validateMessages } from './lib/validator.mjs';
const base = loadVisualProfile(), index = readJson('generated/visual-index.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'agenui-visual-check-'));
const rows = [];
try {
  const all = structuredClone(loadCatalog().profile); all.components.push('Chart','Markdown','Lottie');
  const allPath=path.join(temp,'all.json');fs.writeFileSync(allPath,JSON.stringify(all));
  const env=loadCatalog(allPath), normal=loadCatalog();
  const profiles=[
    {...base,theme:'light',density:'compact'}, {...base,theme:'dark',density:'compact'},
    {...base,theme:'light',density:'spacious'}, {...base,theme:'dark',density:'spacious'},
    {...base,theme:'light',density:'compact',lengthScale:1,fontScale:1.25}
  ];
  const check=(entry,visual)=>{
    const sid='template-check';
    const messages=[{version:'v0.9',createSurface:{surfaceId:sid,catalogId:env.profile.catalogId}}];
    if(Object.keys(entry.initialData).length)messages.push({version:'v0.9',updateDataModel:{surfaceId:sid,path:'/',value:entry.initialData}});
    messages.push({version:'v0.9',updateComponents:{surfaceId:sid,components:[...entry.dependencies,entry.focus,{id:'root',component:'Column',children:['focus'],styles:rootStyle(visual)}]}});
    return messages;
  };
  for(const profile of profiles)for(const item of index.components)for(const variant of item.variants){
    const entry=expandTemplate(item.component,variant,profile), messages=check(entry,profile);
    const result=validateMessages(messages,{env,surface:'new'});
    assert.deepEqual(result.diagnostics,[],`${item.component}.${variant} ${JSON.stringify(profile)}\n${JSON.stringify(result.diagnostics)}`);
    const zero=[entry.focus,...entry.dependencies].filter(n=>n.styles?.['line-clamp']===0);
    assert.equal(zero.length,0);
    rows.push({component:item.component,variant,theme:profile.theme,density:profile.density,lengthScale:profile.lengthScale,fontScale:profile.fontScale,valid:true});
  }
  const blocked=[];
  for(const name of ['Chart','Markdown','Lottie']){
    const result=validateMessages(check(expandTemplate(name,'default',base),base),{env:normal,surface:'new'});
    assert.ok(result.diagnostics.some(d=>d.code==='E_COMPONENT'));
    blocked.push({component:name,rejectedByDefault:true});
  }
  const report={templates:index.components.length,variants:index.components.reduce((n,i)=>n+i.variants.length,0),schemaChecks:rows.length,passed:rows.length,defaultExtensionChecks:blocked,deviceTested:false,mediaFetched:false,scope:'有效Schema/引用/初值，非真实渲染或美学评分',checks:rows};
  fs.mkdirSync(path.join(validatorRoot,'validation'),{recursive:true});
  fs.writeFileSync(path.join(validatorRoot,'validation/visuals.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({templates:report.templates,variants:report.variants,schemaChecks:rows.length,passed:rows.length,defaultExtensionChecks:blocked}));
} finally {fs.rmSync(temp,{recursive:true,force:true});}
