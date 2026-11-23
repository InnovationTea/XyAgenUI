import { writeArtifact } from '../authoring/output.mjs';
const write=(file,messages)=>writeArtifact(file,messages.map(m=>JSON.stringify(m)).join('\n')+'\n');
// Offline sample builder. These fixtures teach syntax; the live model does not select whole-page templates.
import fs from 'node:fs';
import path from 'node:path';
import { validatorRoot, readJson, loadCatalog } from './lib/catalog.mjs';
import { textStyle, rootStyle, expandTemplate, loadVisualProfile } from './lib/styles.mjs';
const profile = loadVisualProfile(), env = loadCatalog();
function decorate(messages) {
  const result=structuredClone(messages);
  const all=result.flatMap(m=>m.updateComponents?.components || []);
  const labels=new Set(all.filter(n=>n.component==='Button').map(n=>n.child));
  for (const n of all) {
    const original = structuredClone(n.styles || {});
    if (n.component==='Text') {
      let role=labels.has(n.id)?'button':n.variant==='h1'?'page':n.variant==='h2'?'group':n.variant==='h3'?'section':n.variant==='caption'?'hint':/result|value/.test(n.id)?'metric':/title|heading/.test(n.id)?'section':'body';
      Object.assign(n,textStyle(role,profile));
      if(original['line-clamp']===3)n.styles['line-clamp']=3;
    } else if(n.id==='root') n.styles=rootStyle(profile);
    else if(n.component==='Card') n.styles=expandTemplate('Card','default',profile).focus.styles;
    else if(n.component==='Button') n.styles=expandTemplate('Button','default',profile).focus.styles;
    else if(n.component==='Column') n.styles=expandTemplate('Column','default',profile).focus.styles;
    else if(n.component==='Row') n.styles=expandTemplate('Row','default',profile).focus.styles;
    else {
      try { n.styles=structuredClone(expandTemplate(n.component,'default',profile).focus.styles || {}); } catch { /* Unsupported source fixtures are caught by validation, never silently converted. */ }
    }
  }
  return result;
}
for(const folder of ['golden','snippets']) {
  const dir=path.join(validatorRoot,'authoring/examples',folder);
  for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort()) write(`examples/${folder}/${file.replace(/\.json$/,'.ndjson')}`,decorate(readJson(`authoring/examples/${folder}/${file}`)));
}
const sid='portion-planner';
const create={version:'v0.9',createSurface:{surfaceId:sid,catalogId:env.profile.catalogId}};
const data=(p,v)=>({version:'v0.9',updateDataModel:{surfaceId:sid,path:p,value:v}});
const update=nodes=>({version:'v0.9',updateComponents:{surfaceId:sid,components:nodes}});
const t=(id,text,variant='body')=>({id,component:'Text',text,variant});
const root=children=>({id:'root',component:'Column',children});
const multiply=(a,b)=>({call:'calculateNumber',returnType:'number',args:{left:a,right:b,operator:'multiply'}});
const fmt=value=>({call:'formatNumber',returnType:'string',args:{value,decimals:0,grouping:false}});
const perPerson={path:'/form/perPerson'};
const totalGrams=multiply(3,perPerson);
const meatCost={call:'formatCurrency',returnType:'string',args:{value:multiply(totalGrams,0.06),currency:'CNY',decimals:2}};
const messages=[create,data('/form/perPerson',250),update([
  t('page_title','🥘 火锅 · 用量测算','h2'),
  t('estimate_note','按 3 人、肉类每千克 60 元试算，仅含肉类费用。以实际单价、食量和包装为准。'),
  {id:'meat_input',component:'Slider',label:'每人肉量（克，生重）',min:150,max:450,value:perPerson},
  t('meat_label','肉类合计（克）'),t('meat_result',fmt(totalGrams)),
  t('cost_label','肉类估价（人民币）'),t('cost_result',meatCost),
  {id:'quantity_body',component:'Column',children:['page_title','estimate_note','meat_input','meat_label','meat_result','cost_label','cost_result']},
  {id:'quantity_card',component:'Card',child:'quantity_body'},root(['quantity_card'])
]),data('/shopping',[{id:'meat',name:'肉类',note:'按下方采购规格分装',done:false},{id:'vegetable',name:'蔬菜与菌菇',note:'另按食量和忌口准备',done:false}]),update([
  t('list_title','🛒 采购记录','h3'),t('item_name',{path:'name'}),t('item_note',{path:'note'},'caption'),
  {id:'item_done',component:'CheckBox',label:'已采购',value:{path:'done'}},
  {id:'shopping_item',component:'Column',children:['item_name','item_note','item_done']},
  {id:'shopping_list',component:'List',direction:'vertical',children:{path:'/shopping',componentId:'shopping_item'}},
  t('pack_label','分装为 2 盒时每盒约重（克）'),
  t('pack_amount',fmt(multiply(totalGrams,0.5))),
  {id:'shopping_body',component:'Column',children:['list_title','shopping_list','pack_label','pack_amount']},
  {id:'shopping_card',component:'Card',child:'shopping_body'},root(['quantity_card','shopping_card'])
]),data('/form/needs',[]),update([
  t('needs_title','🍲 补充偏好','h3'),
  {id:'needs',component:'ChoicePicker',label:'偏好只用于后续提交，不自动改变上方肉量公式',variant:'multipleSelection',displayStyle:'checkbox',options:[{label:'🥬 多些蔬菜',value:'多些蔬菜'},{label:'🍲 清淡锅底',value:'清淡锅底'}],value:{path:'/form/needs'}},
  t('submit_label','按当前用量生成采购建议'),
  {id:'submit',component:'Button',child:'submit_label',variant:'primary',action:{functionCall:{call:'sendMsgToXiaoyi',args:{query:'火锅已确定3人，每人肉量 ${/form/perPerson} 克，偏好 ${/form/needs}。请给出采购建议。',perPerson:{path:'/form/perPerson'},needs:{path:'/form/needs'}}}}},
  {id:'needs_body',component:'Column',children:['needs_title','needs','submit']},
  {id:'needs_card',component:'Card',child:'needs_body'},root(['quantity_card','shopping_card','needs_card'])
])];
write('examples/golden/portion-planner.ndjson',decorate(messages));

const spaceId='moon-mars';
const spaceUpdate=components=>({version:'v0.9',updateComponents:{surfaceId:spaceId,components}});
const overview=[
  t('overview_title','月球与火星','h1'),
  t('overview_body','月球是地球的天然卫星，火星是围绕太阳公转的行星。两者的地表和大气条件差异明显。'),
  {id:'comparison',component:'Table',columns:['比较项','月球','火星'],rows:[
    ['平均半径','约 1,737 千米','约 3,390 千米'],
    ['大气','极稀薄外逸层','稀薄，以二氧化碳为主'],
    ['地貌','撞击坑与月海','撞击坑、火山与峡谷']
  ]}
];
const planetPanels=[
  {
    id:'moon',title:'月球',description:'NASA 的月球、地球与太阳合成图',
    image:'https://science.nasa.gov/wp-content/uploads/2023/03/moon-1-jpeg.webp',
    facts:'深色的月海是古老熔岩平原。缺少稠密大气意味着在月面活动时，需要设备提供呼吸和温度防护。',
    source:'https://science.nasa.gov/moon/'
  },
  {
    id:'mars',title:'火星',description:'NASA 维京号轨道器拍摄的火星全球视图',
    image:'https://assets.science.nasa.gov/content/dam/science/psd/mars/resources/detail_files/7/7668_Mars-viking-2-orbiter-global-view-partial-valles-marinares-PIA04304-full2.jpg/jcr:content/renditions/cq5dam.web.1280.1280.jpeg',
    facts:'地表尘埃中的氧化铁让火星呈红色。火星有稀薄大气和天气活动，尘暴会影响地表能见度。',
    source:'https://science.nasa.gov/mars/'
  }
];
const detailNodes=planetPanels.flatMap(({id,title,description,image,facts,source})=>[
  t(id+'_title',title,'h3'),
  {id:id+'_image',component:'Image',url:image,description,fit:'contain',variant:'mediumFeature'},
  t(id+'_description',description,'caption'),
  t(id+'_facts',facts),
  {id:id+'_source',component:'RichText',text:'<p>来源：<a href="'+source+'">NASA '+title+'资料</a></p>',linksEnable:true},
  {id:id+'_panel',component:'Column',children:['_title','_image','_description','_facts','_source'].map(suffix=>id+suffix)}
]);
write('examples/golden/moon-mars.ndjson',decorate([
  {version:'v0.9',createSurface:{surfaceId:spaceId,catalogId:env.profile.catalogId}},
  spaceUpdate([...overview,root(overview.map(node=>node.id))]),
  spaceUpdate([
    ...detailNodes,
    {id:'details',component:'Tabs',tabs:planetPanels.map(({id,title})=>({title,child:id+'_panel'}))},
    root([...overview.map(node=>node.id),'details'])
  ])
]));

const unitSid='unit-calibration';
write('examples/snippets/unit-calibration.ndjson',[
 {version:'v0.9',createSurface:{surfaceId:unitSid,catalogId:env.profile.catalogId}},
 {version:'v0.9',updateComponents:{surfaceId:unitSid,components:[
  {id:'a',component:'Text',text:'显式16vp：与下方无单位16应等大',styles:{'font-size':'16vp','line-height':1.5}},
  {id:'b',component:'Text',text:'无单位16：按已确认的宿主契约解释为16vp',styles:{'font-size':'16','line-height':1.5}},
  {id:'square',component:'Column',children:[],styles:{width:'32vp',height:'32vp','background-color':'#0A59F7'}},
  {id:'square_bare',component:'Column',children:[],styles:{width:'32',height:'32','background-color':'#0A59F7'}},
  {id:'root',component:'Column',children:['a','b','square','square_bare'],styles:{padding:'16vp',gap:'16vp'}}
 ]}}
]);
console.log('已按当前视觉配置重建 golden/snippets 夹具');
