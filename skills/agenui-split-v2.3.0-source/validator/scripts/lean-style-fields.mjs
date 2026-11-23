import fs from 'node:fs';
import path from 'node:path';

// By-schema grouping makes the optional lookup shorter while keeping each property discoverable.
const note = {
  'font-weight':'normal / medium / bold；或 100～900 的整百数（也可用整数字符串）',
  'font-family':'字体族字符串，如 system；不要指定未确认安装的字体',
  'line-height':'非负 number 是字号倍率；绝对高度用长度字符串',
  'background-color':'#RRGGBB / #RRGGBBAA、rgb()/rgba()，或 Catalog 允许的 linear/radial/conic-gradient()',
  'background-image':'url(...)；项目要求已知、无凭据的 HTTPS 字面量地址',
  'filter':'drop-shadow(...)；不扩展为其他 CSS filter',
  'aspect-ratio':'数字或宽/高的字符串，如 "1.5" 或 "16/9"',
  'text-decoration':'underline / line-through / none，可按顺序加线型和颜色',
};
function explain(key,s) {
  if(note[key]) return note[key];
  if(s.enum) return s.enum.join(' / ');
  if(s.type==='number'||s.type==='integer') return (s.type==='number'?'数字':'整数')+(s.minimum!==undefined?' ≥ '+s.minimum:'')+(s.maximum!==undefined?' 且 ≤ '+s.maximum:'');
  if(s.pattern?.includes('vp')){
    const re=new RegExp(s.pattern), pieces=[re.test('4vp 8vp')?'1–4 个非负长度':'非负长度'];
    if(re.test('50%'))pieces.push('百分比');if(re.test('auto'))pieces.push('auto');
    return '字符串：'+pieces.join(' / ');
  }
  if(s.pattern?.includes('#[0-9a-fA-F]'))return '颜色字符串：#RRGGBB / #RRGGBBAA 或 rgb()/rgba()';
  throw Error('样式字段需要维护说明：'+key);
}
function table(props){
  const groups=new Map();
  for(const [key,schema] of Object.entries(props)){
    const desc=explain(key,schema);
    if(!groups.has(desc))groups.set(desc,[]); groups.get(desc).push(key);
  }
  return ['|字段|取值|','|---|---|',...Array.from(groups,([desc,keys])=>'|'+keys.map(k=>'\x60'+k+'\x60').join('、')+'|'+desc+'|')].join('\n');
}
export function buildStyleFields({stage,out}) {
  const defs=JSON.parse(fs.readFileSync(path.join(stage,'generated/effective-catalog.json'),'utf8')).$defs;
  const common=defs.common_types_Styles.properties;
  const text=Object.fromEntries(Object.entries(defs.common_types_TextStyles.properties).filter(([key])=>!Object.hasOwn(common,key)));
  const doc=['# 样式字段速查','', '仅在选定模板需要微调时查本页。尺寸和颜色如何选见[视觉规则](visual.md)；组件自己的扩展样式见对应[组件章节](components/index.md)。本表映射当前有效 Catalog 的字段，生成时仍须遵守组件自身的附加条件。','', '## 通用 styles','',table(common),'','## Text 独有的 styles','',table(text),'','完整文字省略 line-clamp。RichText、Markdown 与输入控件不要照搬 Text 专属字段。',''].join('\n');
  fs.mkdirSync(path.join(out,'references'),{recursive:true});fs.writeFileSync(path.join(out,'references/style-fields.md'),doc);
}
