import test from 'node:test';
import assert from 'node:assert/strict';
import { expandTemplate,loadVisualProfile,textStyle } from '../scripts/lib/styles.mjs';
import { lintVisual,contrastRatio } from '../scripts/lib/visual-lint.mjs';
import { loadCatalog,readJson } from '../scripts/lib/catalog.mjs';
const p=loadVisualProfile();
test('默认vp设计值不再二倍输出，复合尺寸逐项还原且无量纲行高保持',()=>{
 assert.equal(p.unit,'vp');assert.equal(p.unitlessLengthUnit,'vp');
 assert.equal(p.lengthScale,1);assert.equal(p.fontScale,1);
 assert.equal(textStyle('body',p).styles['font-size'],'16vp');
 assert.equal(textStyle('page',p).styles['font-size'],'30vp');
 assert.equal(textStyle('body',p).styles['line-height'],1.5);
 const b=expandTemplate('Button','default',p);
 assert.equal(b.focus.styles['min-height'],'48vp');
 assert.equal(b.focus.styles.padding,'12vp 20vp 12vp 20vp');
 assert.equal(expandTemplate('Card','default',p).focus.styles['border-radius'],'16vp');
});
test('vp与无单位等值长度不会被视觉lint误报为样式漂移',()=>{
 for(const suffix of ['vp','']){
  const messages=[{updateComponents:{components:[
   {id:'t',component:'Text',text:'人数',styles:{'font-size':'16'+suffix}},
   {id:'c',component:'Card',child:'t',styles:{'border-radius':'16'+suffix}}
  ]}}];
  assert.deepEqual(lintVisual(messages,p).warnings,[]);
 }
});
test('模板选择不会修改源配方，完整Text省略line-clamp且有summary变体',()=>{
 const before=readJson('authoring/styles/recipes/Text.json');
 const body=expandTemplate('Text','body',p);assert.equal(body.focus.styles['line-clamp'],undefined);
 assert.equal(expandTemplate('Text','summary',p).focus.styles['line-clamp'],3);
 assert.deepEqual(readJson('authoring/styles/recipes/Text.json'),before);
});
test('Button次要变体同步改变标签前景与按钮背景',()=>{
 const b=expandTemplate('Button','secondary',p);
 const label=b.dependencies.find(n=>n.id===b.focus.child);
 assert.ok(contrastRatio(label.styles.color,b.focus.styles['background-color'])>4.5);
 const dark=expandTemplate('Button','default',{...p,theme:'dark'});
 assert.ok(contrastRatio(dark.dependencies[0].styles.color,dark.focus.styles['background-color'])>4.5);
});
test('字体和布局使用两个独立比例，不修改公式或绑定',()=>{
 const a=expandTemplate('Button','default',p),b=expandTemplate('Button','default',{...p,lengthScale:1,fontScale:3});
 assert.equal(b.focus.styles['min-height'],'48vp');assert.equal(b.dependencies[0].styles['font-size'],'48vp');
 assert.deepEqual(a.focus.action,b.focus.action);
});
test('视觉lint只报告，不静默改字段，不当成完整渲染验收',()=>{
 const m=[{updateComponents:{components:[{id:'t',component:'Text',text:'结果',styles:{'font-size':'77vp',color:'#FF00FF'}}]}}];
 const old=structuredClone(m);assert.equal(lintVisual(m,p).warnings.length,2);assert.deepEqual(m,old);
});
test('本轮effective Catalog与导出的能力文件完全一致',()=>assert.deepEqual(readJson('generated/effective-catalog.json'),loadCatalog().catalog));
test('图片和Carousel模板遵循最新的字面量HTTPS合同，资源仍标为夹具',()=>{
 const image=expandTemplate('Image','default',p);assert.equal(typeof image.focus.url,'string');assert.ok(image.focus.url.startsWith('https://'));assert.ok(image.resourceRequired);
 const carousel=expandTemplate('Carousel','default',p);assert.ok(carousel.focus.content.every(x=>x.startsWith('https://')));
});
