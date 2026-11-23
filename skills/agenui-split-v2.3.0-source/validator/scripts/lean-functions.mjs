// Release tooling only: derive signatures, return types, origins and availability from the staged contract.
import fs from 'node:fs';
import path from 'node:path';
import { readJson } from './lib/catalog.mjs';

const scenarios = {
  required: '必填检查：值不为空。', regex: '字符串是否匹配给定模式。', length: '检查字符串长度。', numeric: '检查数值范围，不负责转换文本。', email: '检查邮箱格式。',
  and: '全部条件同时成立。', or: '至少一个条件成立。', not: '布尔取反。',
  formatString: '按已初始化的路径或具名值函数插入文案。', formatNumber: '把数值格式化为显示文本；可设小数位和分组。',
  formatCurrency: '把以货币主单位表示的金额格式化；currency 用 ISO 4217 代码，如 CNY；不做汇率或分/元换算。',
  formatDate: '按 Unicode TR35 格式化日期；如 yyyy-MM-dd HH:mm。', pluralize: '按语言的复数类别选文案；other 为兜底。',
  token: '解析宿主已加载的主题 Token；不能假定项目视觉表中的任意键已被宿主注册。',
  openUrl: '通过宿主打开 URI；仅用于动作位置，需启用并注册接收方。',
  calculateNumber: '计算数值；数值中间结果用 number，直接显示可以返回 string。',
  sendMsgToXiaoyi: '向小艺发送消息；只作为按钮点击动作。', resolveCalls: '递归解析 json 内的值函数，保留路径声明。'
};
const signatureTypes = {
  common_types_DynamicString: 'S', common_types_DynamicNumber: 'N', common_types_DynamicBoolean: 'B',
  common_types_DynamicValue: 'V'
};
const inline = s => String.fromCharCode(96) + s + String.fromCharCode(96);
const fence = x => String.fromCharCode(96).repeat(3) + 'json\n' + JSON.stringify(x) + '\n' + String.fromCharCode(96).repeat(3);
const typeOf = s => {
  if (!s) throw Error('缺少函数类型');
  if (s.$ref) {
    const k = s.$ref.split('/').at(-1);
    if (!signatureTypes[k]) throw Error('未描述的函数参数引用：'+s.$ref);
    return signatureTypes[k];
  }
  if (s.const !== undefined) return String(s.const);
  if (s.enum) return s.enum.join(' / ');
  if (s.type === 'array') return typeOf(s.items) + '[]' + (s.minItems !== undefined ? '（≥'+s.minItems+'项）' : '');
  if (s.type === 'integer') return 'int' + (s.minimum !== undefined ? (s.maximum !== undefined ? '（'+s.minimum+'…'+s.maximum+'）' : '≥'+s.minimum) : '');
  if (s.format === 'uri') return 'URI字符串';
  if (s.type) return s.type;
  return '任意参数值';
};
function table(names, catalog) {
  const rows=names.map(n=>{
    const f=catalog.functions[n],a=f.properties.args;
    const params=Object.entries(a.properties || {}).map(([key,s])=>inline(key+((a.required||[]).includes(key)?'':'?')+':'+typeOf(s)));
    for(const g of a.anyOf?[a.anyOf]:[]) params.push(g.map(s=>s.required.join('+')).join('/')+' 至少一项');
    if (a.additionalProperties && typeof a.additionalProperties === 'object') params.push('可追加命名快照参数：'+inline(typeOf(a.additionalProperties)));
    return '|'+inline(n)+'|'+params.join('，')+'|'+inline(typeOf(f.properties.returnType))+(f.required.includes('returnType')?' **必填**':'')+'|'+scenarios[n]+'|';
  });
  return ['|call|args（? 表示可选）|returnType|何时用|','|---|---|---|---|',...rows].join('\n');
}
function byState(names, active, catalog) {
  const groups=[[true,'默认启用'],[false,'默认关闭：仅在实际宿主注册并启用后使用']];
  return groups.map(([yes,title])=>{
    const list=names.filter(n=>active.has(n)===yes);
    return list.length ? '## '+title+'（'+list.length+'）\n\n'+table(list,catalog)+'\n' : '';
  });
}
export function buildLeanFunctions({stage,out}) {
  const catalog=JSON.parse(fs.readFileSync(path.join(stage,'generated/effective-catalog.json'),'utf8'));
  const vendor=readJson('vendor/agenui_catalog.json');
  const names=Object.keys(catalog.functions);
  for (const n of names) if (!scenarios[n]) throw Error('新函数缺少用途说明：'+n);
  const builtin=names.filter(n=>Object.hasOwn(vendor.functions,n)).sort((a,b)=>Object.keys(scenarios).indexOf(a)-Object.keys(scenarios).indexOf(b));
  const custom=names.filter(n=>!Object.hasOwn(vendor.functions,n));
  const active=new Set(catalog.$defs.anyFunction.oneOf.map(s=>s.$ref.split('/').at(-1)));
  const [officialOn,officialOff]=byState(builtin,active,catalog);
  const [hostOn,hostOff]=byState(custom,active,catalog);
  const target=path.join(out,'references/functions');fs.mkdirSync(target,{recursive:true});
  const save=(name,parts)=>fs.writeFileSync(path.join(target,name+'.md'),parts.filter(Boolean).join('\n\n').replace(/\n{3,}/g,'\n\n').trimEnd()+'\n');
  const typeKey='S/N/B 是动态字符串/数值/布尔：同类型常量、已初始化的 path 或返回对应类型的值函数。V 是动态值（字符串、数值、布尔、数组、path 或已启用的值函数）。小写类型和枚举按字面传入。';
  save('builtin',[
    '# 官方内置函数',
    '“内置”按本项目锁定的高德 AGenUI Catalog 判断；可用性以本轮 profile 为准。表中均须写 '+inline('call')+'、'+inline('args')+'；'+inline('returnType')+' 未标必填时可省略，嵌套与动态属性建议显式写出对应类型。',
    typeKey,officialOn,
    '## 两种常见写法',
    '输入框 '+inline('checks[].condition')+' 的布尔条件。先将 '+inline('/form/email')+' 初始化为字符串；checks 中的 message 另写提示文案。',
    fence({call:'and',returnType:'boolean',args:{values:[{call:'required',returnType:'boolean',args:{value:{path:'/form/email'}}},{call:'email',returnType:'boolean',args:{value:{path:'/form/email'}}}]}}),
    '金额展示：'+inline('/plan/amount')+' 已初始化为以元为单位的 number。将此对象放在 '+inline('Text.text')+'；显示结果是 string，不再用于计算。',
    fence({call:'formatCurrency',returnType:'string',args:{value:{path:'/plan/amount'},currency:'CNY',decimals:2}}),
    '普通路径插值仅用于已支持的字段；'+inline('formatString')+' 内可用 '+inline('$'+'{/form/name}')+'，函数形式必须是具名参数。任意 JavaScript、算术中缀表达式和未声明的函数不能使用。',
    officialOff,
    '动作只放在 '+inline('Button.action.functionCall')+'；默认没有已启用的打开链接动作。'
  ]);
  save('custom',[
    '# 自定义函数与项目补录扩展',
    '这些签名由本项目加入有效 Catalog。前两项由业务宿主执行；resolveCalls 是本项目补录的实现扩展，不属于此次锁定上游目录的内置列表。类型记法见[内置函数](builtin.md)。调用均需 '+inline('call')+'、'+inline('args')+'；表中粗体标明 '+inline('returnType')+' 必填。',
    hostOn,
    '## 常用联动',
    '合计 = 3 人 × 每人克数。先给 '+inline('/form/perPerson')+' 初始化 number，并让 Slider 写入同一路径；将以下值绑定到 Text.text。计算返回 number，最后才格式化成 string。数字外观的 TextField 仍产生 string，不能直接接入此式。',
    fence({call:'formatNumber',returnType:'string',args:{value:{call:'calculateNumber',returnType:'number',args:{left:3,right:{path:'/form/perPerson'},operator:'multiply'}},decimals:0}}),
    '以下对象仅放入 '+inline('Button.action.functionCall')+'。保留动态声明，让宿主在点击时读取最新值；生成、校验和首屏渲染阶段均不发送消息。额外参数可提供快照，需显示在消息中的值应直接写进 query。',
    fence({call:'sendMsgToXiaoyi',returnType:'void',args:{query:'请按每人 $'+'{/form/perPerson} 克生成采购清单。',perPerson:{path:'/form/perPerson'}}}),
    hostOff,
    'resolveCalls 不授予新函数权限，不能借它在值位置执行动作，也不能代替按钮的点击时求值。'
  ]);
}

