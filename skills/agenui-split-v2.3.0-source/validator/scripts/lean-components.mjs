// Publish task-based booklets with a directly addressable section for each component.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const booklets = [
  ['layout', '布局与分组', ['Column', 'Row', 'Card', 'Divider']],
  ['content', '文字、图标与表格', ['Text', 'RichText', 'Icon', 'Table']],
  ['inputs', '输入与操作', ['TextField', 'Slider', 'CheckBox', 'ChoicePicker', 'DateTimeInput', 'Button']],
  ['navigation', '列表、页签与弹层', ['List', 'Tabs', 'Modal']],
  ['media', '图片、媒体与网页', ['Image', 'Carousel', 'Video', 'AudioPlayer', 'Web']],
  ['extensions', '宿主扩展', ['Chart', 'Markdown', 'Lottie']],
];

// Each note describes one concrete decision the model cannot safely infer just from a schema.
const copy = {
  Column: ['纵排与根布局', '排列跨行内容；同组用 gap，只有主要语义区域需要外壳。root 变体用作回复根时，将示例的 focus 改为 root，children 使用静态 ID 列表。'],
  Row: ['并排短字段或操作', '数量和单位、图标和标题等短项可横排；长标题、大字体导致拥挤时改用 Column。横排本身不计算数值。'],
  Card: ['分隔完整任务区', '只有一个 child；多项内容放在其内部的 Column。glass 适合已有合格背景图的场景，不能添加 blur 或 backdrop-filter。'],
  List: ['重复条目与采购勾选', '静态列表引用 ID；动态列表引用数据数组和模板组件 ID，模板内用相对路径写回对应条目。显示过的输入列表不能由后批替换；不承诺拖拽、侧滑或分页。'],
  Tabs: ['切换同一任务的视角', '每个标签用 title 和 child，child 只填组件 ID；切换由原生页签处理。当前没有可生成的选中索引或切换回调。'],
  Modal: ['按需查看补充信息', 'trigger 和 content 分别引用触发节点、内容节点；核心结果仍放在主界面。打开、关闭和焦点由宿主负责，不虚构 openModal 或占位动作。'],
  Divider: ['区分相邻分组', '留白不足以区分分组时再加分隔线。它无交互状态，不假设背景色能改变原生线色。'],
  Text: ['标题、正文与动态指标', '展示文字、数据路径或字符串值函数。正文完整展示时省略 styles.line-clamp；仅非关键摘要使用 3，禁用 0。数值先格式化为字符串。'],
  RichText: ['短 HTML 富文本', 'text 只用受支持的富文本标签；按需开启链接。不要套用 Text 的 font-size 或 line-clamp，也不承载网页脚本。'],
  Table: ['少列同维度对比', 'columns 是字符串列名，rows 是二维字符串数组；每行的长度必须等于列数。单元格不接受组件、path 或函数；实时结果改用绑定了数据的 Text。'],
  Icon: ['辅助识别', '展示允许的图标名等 name 表示；需要点击时放入 Button，并保留可读标签。不能从图标本身触发业务动作。'],
  Image: ['封面、缩略图与头像', 'url 必须是可直接加载、无凭据的 HTTPS 字面量，styles.width 必须是明确的正宽度字符串。无真实来源时省略图片。'],
  TextField: ['输入自由文本或数字草稿', '可编辑时将 value 绑定到已初始化的字符串路径，label 必填。number 只改变输入外观；草稿不能直接参与数值计算。不要编造 placeholder、onChange 或 error。'],
  Slider: ['调节连续数值', '明确 min、max；value 绑定已初始化且在范围内的 number。需要派生结果时让 Text 绑定值函数。无已验证的 step，不用显示取整来保证整数人数。'],
  ChoicePicker: ['在有限选项中单选或多选', '每项有可读 label、稳定 value；单选仍绑定 string[]，最多一项；已选值不能重复且必须出现在 options 中。选择可供展示或提交；只有显式绑定的结果才会联动。'],
  CheckBox: ['记录独立布尔状态', 'value 绑定 boolean，不能使用字符串 "true"。若用于已采购标记，只改变该项状态；是否改预算由另行定义的计算关系决定。'],
  DateTimeInput: ['选择有业务用途的日期或时间', 'value 绑定合法 ISO 日期、时间、日期时间或空字符串。按需启用 enableDate/enableTime；不填写猜测的日期，时区和系统显示由宿主决定。'],
  Button: ['提交或触发确有接收方的动作', 'child 引用可见标签节点，文字颜色随该节点设置。action 默认只能声明已启用的动作；点击时使用最新绑定值，生成阶段不执行。不要编造禁用或加载属性。'],
  Carousel: ['浏览多张图片', 'content 填无凭据、可直接加载的 HTTPS 字面 URL 数组，不接任意组件子树。需要用户自己浏览时关闭 autoplay。'],
  Video: ['展示已有操作视频', 'url 指向可用资源，实际播放和加载失败由宿主处理。本契约未声明 poster、autoplay 或 controls。'],
  AudioPlayer: ['播放已有语音说明', '播放器内的进度只描述媒体播放；保留文字摘要。不能把它当通用进度条、录音控件或任意自动播放入口。'],
  Web: ['嵌入一个已知网页', '入口为 url，不接 source、inline HTML 或脚本字段。网页内交互由 WebView 处理，不能推断存在与 A2UI DataModel 的通用桥接。'],
  Chart: ['观察趋势、分布或占比', '使用字面数据点并注明单位和来源；line/bar 用具名系列，donut 可用一个含 label 的系列。没有 tooltip、formatter 或任意交互回调字段。'],
  Markdown: ['呈现较长的结构化说明', '独立组件，用 content 接收 Markdown 文本或字符串绑定；与 Text、RichText 同级。标题、代码块的内部样式由扩展渲染器控制。'],
  Lottie: ['非必要的轻量动效', '只在已有可用动画资源时使用；loop 与 autoPlay 控制播放，不代表业务进度。系统的减少动效偏好需由宿主落实。'],
};

const common = new Set(['id','component','weight','accessibility','styles']);
const alias = {
  common_types_DynamicString:'动态<string>',common_types_DynamicNumber:'动态<number>',
  common_types_DynamicBoolean:'动态<boolean>',common_types_DynamicStringList:'动态<string[]>',
  common_types_ComponentId:'组件ID',common_types_CheckRule:'检查规则',common_types_DataBinding:'{path:string}',
  common_types_ChildList:'组件ID[] 或 {path:string,componentId:组件ID}',
  common_types_Action:'{functionCall:已启用的动作函数对象}（默认配置）'
};
function target(c,ref){
  assert.ok(ref.startsWith('#/'),'unexpected external schema reference: '+ref);
  const t=ref.slice(2).split('/').reduce((o,k)=>o?.[k.replace(/~1/g,'/').replace(/~0/g,'~')],c);
  assert.ok(t,'unresolved ref: '+ref);return t;
}
function fields(s,c){
  if(s.$ref)return fields(target(c,s.$ref),c);
  const r={names:{},required:new Set(s.required || [])};
  for(const v of s.allOf || []){
    const a=fields(v,c);Object.assign(r.names,a.names);for(const k of a.required)r.required.add(k);
  }
  Object.assign(r.names,s.properties || {});return r;
}
function shape(s,c){
  if(s.$ref)return alias[s.$ref.split('/').at(-1)] || shape(target(c,s.$ref),c);
  if(s.const!==undefined)return JSON.stringify(s.const);
  if(s.enum)return s.enum.map(v=>JSON.stringify(v)).join(' / ');
  if(s.allOf){
    const core=s.allOf.filter(v=>!v.if).map(v=>shape(v,c));const formats=s.allOf.flatMap(v=>v.then?.oneOf?.map(x=>x.format) || []);
    if(formats.length)core.push('字面量格式：'+formats.join(' / '));
    return core.join('；');
  }
  if(s.oneOf||s.anyOf)return (s.oneOf||s.anyOf).map(v=>shape(v,c)).join(' 或 ');
  if(s.type==='array')return shape(s.items || {},c)+'[]'+(s.minItems?'（至少'+s.minItems+'项）':'');
  if(s.type==='object')return '{'+Object.entries(s.properties || {}).map(([k,v])=>k+(s.required?.includes(k)?'':'?')+':'+shape(v,c)).join(', ')+'}';
  return s.type || '值';
}
const read=(base,name)=>JSON.parse(fs.readFileSync(path.join(base,name),'utf8'));
const put=(dir,name,text)=>fs.writeFileSync(path.join(dir,name),text);
function fragment(entry){
  const init=Object.keys(entry.initialData).length?('  "initialData": '+JSON.stringify(entry.initialData)+',\n'):'';
  const rows=[...entry.dependencies,entry.focus].map(v=>'    '+JSON.stringify(v)).join(',\n');
  return '{\n'+init+'  "components": [\n'+rows+'\n  ]\n}';
}
function table(type){return '`'+type.replaceAll('|','\\|')+'`';}

export function buildLeanComponents({stage,out}){
  const dir=path.join(out,'references/components');fs.mkdirSync(dir,{recursive:true});
  const c=read(stage,'generated/effective-catalog.json'), idx=read(stage,'styles/index.json');
  const names=booklets.flatMap(([, ,list])=>list);assert.deepEqual([...names].sort(),Object.keys(c.components).sort(),'新增/移除组件后请明确场景分组与边界');
  const map=new Map(idx.components.map(item=>[item.component,item]));
  const docs=[];
  for(const [file,group,list] of booklets){
    const sections=['# '+group];
    docs.push('## '+group,'','|组件|何时使用|','|---|---|');
    for(const name of list){
      const item=map.get(name),p=read(stage,'styles/templates/'+name+'.json');assert.ok(item);
      const [usage,note]=copy[name];docs.push('|['+name+']('+file+'.md#'+name.toLowerCase()+')|'+usage+'|');
      const f=fields(c.components[name],c);
      const t=['## '+name,'',usage+'。','', '默认'+(item.enabled?'启用。':'关闭，仅宿主已注册并启用后使用。')+note,'','### 参数','','|字段|必填|格式或枚举|','|---|---|---|'];
      for(const [k,v] of Object.entries(f.names)){
        if(common.has(k))continue;
        const format=name==='Image'&&k==='url'?'HTTPS 字面字符串（无凭据）':shape(v,c);
        t.push('|'+table(k)+'|'+(f.required.has(k)?'是':'否')+'|'+table(format)+'|');
      }
      if(name==='ChoicePicker'||name==='DateTimeInput'){
        const s=f.names.styles.properties;
        const extension=Object.entries(s).filter(([k])=>!(k in c.$defs.common_types_Styles.properties));
        if(extension.length){
          const local=name==='DateTimeInput'?Object.entries(s.compact.properties):extension;
          const parent=name==='DateTimeInput'?'styles.compact':'styles';
          const color=local.filter(([k])=>k.includes('color')).map(([k])=>table(k));
          const length=local.filter(([k])=>!k.includes('color')).map(([k])=>table(k));
          t.push('','**本宿主的可选兼容样式**（'+table(parent)+'）：',
            '- 长度字符串，例如 '+table('"8vp"')+'：'+length.join('、')+'。',
            '- 十六进制颜色字符串（#RRGGBB 或 #RRGGBBAA）：'+color.join('、')+'。');
        }
      }
      if(p.variants.default.resourceRequired || name==='Web')t.push('','模板中的示例 URL 只展示语法；真实回复须换为可用来源。');
      t.push('','### 模板片段');
      const groupedSnippets=new Map();
      for(const [key,v] of Object.entries(p.variants)){
        const json=fragment(v);
        if(!groupedSnippets.has(json))groupedSnippets.set(json,[]);
        groupedSnippets.get(json).push(key);
      }
      for(const [json,keys] of groupedSnippets) t.push('','#### '+keys.join(' / '),'','```json',json,'```');
      sections.push('',...t);
    }
    put(dir,file+'.md',sections.join('\n')+'\n');
    docs.push('');
  }
  const intro=[
    '# 组件索引','',
    '点击组件名直达分册中的对应章节，只读本批需要的参数与模板。前五组默认可用；宿主扩展须先注册并启用。','',
    ...docs,
    '## 共同字段和模板读法','',
    '- 每个节点必填 `id:string` 和 `component`（本节组件名）；可选 `styles` 样式对象；`accessibility` 对象中的 `label` 和 `description` 均为可选动态字符串。作为 Row/Column 直接子项时可选 `weight:number`。通用样式见[样式字段](../style-fields.md)；各组件的参数表只列专有字段。',
    '- `动态<T>` 表示类型为 T 的常量、`{path}` 或返回相应类型的已启用值函数。可编辑控件的 value 用已初始化的可写路径。`检查规则` 是 `{condition:动态<boolean>,message:string}`；只在列出 checks 的组件使用。嵌套参数中 `?` 表示可省略。',
    '- 同一标题中的变体名共用完全相同的片段；其余变体均已展开，不做补丁合并。若有 initialData，把相应初值在**绑定前**用 updateDataModel 初始化；后批只写新增路径。把 components 内的节点加入本批 updateComponents，依赖已排在当前节点前；把示例 ID、引用、路径、文案和业务数据改成当前任务的值，并从本轮根节点挂接。不要输出变体名、initialData 或模板外壳。',
    '- 同名模板 default 不表示 DSL 的 variant 字段也叫 default。按所选模板里的实际字段生成。',''
  ];
  put(dir,'index.md',intro.join('\n'));
  return {components:map.size,variants:idx.components.reduce((n,i)=>n+i.variants.length,0)};
}
