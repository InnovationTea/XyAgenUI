from pathlib import Path
import json, copy, argparse, hashlib, re

ap=argparse.ArgumentParser(description='离线生成 Skill 组件视觉参考；不是新的端侧 UI 协议。')
ap.add_argument('--out',default=str(Path(__file__).resolve().parents[1]))
ap.add_argument('--skill',required=True,help='已有 agenui-reply 项目目录')
ap.add_argument('--length-scale',type=float,default=1.0,help='显式项目布局缩放；默认1，不是px/vp换算')
ap.add_argument('--font-scale',type=float,default=1.0,help='显式项目字号缩放；默认1，不重复乘系统字体缩放')
a=ap.parse_args()
if not(0<a.length_scale<=8 and 0<a.font_scale<=8):raise SystemExit('scale 必须在 (0,8]；项目vp基线默认1')
O=Path(a.out); K=Path(a.skill); S=a.length_scale; F=a.font_scale
base=json.load(open(K/'capabilities/profiles/default.json')); catalog_id=base['catalogId']
for x in ['templates','examples/harmony-candidate','scripts','validation','docs']: (O/x).mkdir(parents=True,exist_ok=True)
def dump(p,v): (O/p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def vp(n,s=S):return f'{n*s:g}vp'
def pad(*v):return ' '.join(vp(n) for n in v)
C=dict(page='#F1F3F5',surface='#FFFFFF',primary='#16181D',secondary='#343A40',muted='#555D66',accent='#0A59F7',tint='#EEF4FF',divider='#D5DAE0',inputBorder='#7A838F',onAction='#FFFFFF',action='#16181D',error='#B42318',success='#027A48',warning='#9A6700')
D=dict(page='#111315',surface='#202224',primary='#F4F5F6',secondary='#D5D9DF',muted='#AEB6C2',accent='#8CB6FF',tint='#182B48',divider='#3D444D',inputBorder='#838D9B',onAction='#16181D',action='#F4F5F6',error='#FFB4AB',success='#76D6A4',warning='#EFC46A')
roles={
 'page':(30,'bold','primary','h1'), 'group':(24,'bold','primary','h2'), 'section':(20,'bold','primary','h3'),
 'subheading':(18,'bold','primary','h4'), 'body':(16,'normal','secondary','body'), 'hint':(14,'normal','muted','body'),
 'caption':(12,'normal','muted','caption'), 'metric':(38,'bold','primary','h2'), 'button':(16,'bold','onAction','body')}
def tx(id,text,role='body',**kw):
 n,w,c,v=roles[role];styles={'font-size':vp(n,F),'font-weight':w,'color':C[c],'line-height':1.5 if role in ['body','hint'] else 1.3,'text-align':'left'}
 styles.update(kw.pop('styles',{}));return dict(id=id,component='Text',text=text,variant=v,styles=styles,**kw)
def col(id,ch,gap=12,**styles):return dict(id=id,component='Column',children=ch,styles={'gap':vp(gap),**styles})
def row(id,ch,**kw):return dict(id=id,component='Row',children=ch,align='center',styles={'gap':vp(8)},**kw)
def card(id,child,em=False):return dict(id=id,component='Card',child=child,styles={'background-color':C['tint'] if em else C['surface'],'border-radius':vp(16),'padding':pad(16,16,16,16)})
def root(ch):return col('root',ch,16,padding=pad(16,16,16,16),**{'background-color':C['page'],'border-radius':vp(20)})
def path(p):return {'path':p}
def fn(name,args,typ):return {'call':name,'args':args,'returnType':typ}
def action(query='请根据当前条件继续生成一份采购清单。'):
 return {'functionCall':{'call':'sendMsgToXiaoyi','args':{'query':query},'returnType':'void'}}
def bt(id,child,variant='primary'):
 st={'min-height':vp(48),'padding':pad(12,20,12,20),'border-radius':vp(20),'align-self':'center','background-color':C['action']}
 return dict(id=id,component='Button',child=child,variant=variant,action=action(),styles=st)
def nd(p,msgs): (O/p).write_text(''.join(json.dumps(m,ensure_ascii=False,separators=(',',':'))+'\n' for m in msgs),encoding='utf-8')
def msg(op,body):return {'version':'v0.9',op:body}
T=[]
def add(name,focus,deps=None,data=None,variants=None,scene='',dynamic='',limit='',requirements=None):
 deps=deps or [];data=data or {}; sid='style_'+name.lower(); nodes=deps+[focus,root([focus['id']])]
 messages=[msg('createSurface',dict(surfaceId=sid,catalogId=catalog_id))]
 if data:messages.append(msg('updateDataModel',dict(surfaceId=sid,path='/',value=data)))
 messages.append(msg('updateComponents',dict(surfaceId=sid,components=nodes)))
 temp={'templateId':f'{name}.harmony-minimal.v1','component':name,'status':'candidate-no-device-test',
 'authority':'项目设计模板，不是官方新增组件或 A2UI 字段',
 'unitProfile':{'name':'harmony-vp','unit':'vp','unitlessDefault':'vp','valueType':'string','lengthScale':S,'fontScale':F,'semanticsConfirmed':True,'confirmationBasis':'用户已确认当前端侧支持vp，尺寸字符串无单位时默认vp；属于项目宿主约定','nativeVisualQA':False,'accessibilityFontScaleQA':False},
 'scene':scene,'dynamicContract':dynamic,'boundary':limit,'requirements':requirements or [],
 'mutableFields':['id','text/content/label：仅该组件支持的字段','data binding / child IDs / action：保持契约'],
 'stylePolicy':'固定选中变体的样式；变化的是内容、绑定与合法引用。整体换密度或颜色方案，禁止随机单项漂移。',
 'focus':focus,'dependencies':deps,'initialData':data,'variants':variants or {},'exampleFile':f'../examples/harmony-candidate/{name}.jsonl'}
 T.append(temp);dump(f'templates/{name}.json',temp);nd(f'examples/harmony-candidate/{name}.jsonl',messages)

# Display and structure; examples use realistic content only as test data.
add('Text',tx('focus','先调整预计人数，再按实际食量选择每人用量。'),variants={k:{'focus':{key:val for key,val in tx('focus','示例文字',k).items() if key in ['variant','styles']}} for k in roles},scene='标题、正文、说明、关键数值分别选用语义变体。',dynamic='text 可以是字符串、合法路径或返回字符串的函数。',limit='Text 样式不复制到 RichText、Button 或 Icon；正文完整换行。数值样式不是自动计算器。')
add('Image',dict(id='focus',component='Image',url='https://example.invalid/agenui/template-cover.png',description='火锅聚餐配图：离线结构fixture，使用前替换为已核验资源',fit='cover',variant='mediumFeature',styles={'width':'100%','aspect-ratio':'3/2','border-radius':vp(8)}),variants={'thumbnail':{'focus':{'variant':'icon','styles':{'width':vp(64),'height':vp(64),'aspect-ratio':'1','border-radius':vp(8)}}},'avatar':{'focus':{'variant':'avatar','styles':{'width':vp(40),'height':vp(40),'aspect-ratio':'1','border-radius':vp(20)}}}},scene='有信息作用的封面、缩略图或头像。',dynamic='资源加载与失败表现由 ImageLoader/宿主提供。',limit='显式宽度；不拉伸、不造图；摘要卡不默认大横幅。',requirements=['以已核验可访问的无凭据HTTPS直链替换example.invalid离线fixture；素材未随包提供','宿主 ImageLoader'])
add('Icon',dict(id='focus',component='Icon',name='shoppingCart',styles={'width':vp(20),'height':vp(20)}),scene='辅助标题或操作含义。',dynamic='需要点击时放入真实 Button；图标本身不是业务动作。',limit='只用注册名称；内部颜色跟主题，不写 Text 专属 color；不以单独图标替代关键文字。')
add('Divider',dict(id='focus',component='Divider',axis='horizontal',styles={'margin':pad(8,0,8,0)}),scene='区分相邻信息组，优先用留白。',dynamic='无本地状态。',limit='不假设 background-color 能改变原生线色；线色由主题/已验收能力控制。')
add('Video',dict(id='focus',component='Video',url=path('/assets/video'),styles={'width':'100%','aspect-ratio':'16/9','border-radius':vp(8)}),data={'assets':{'video':'res://template_video'}},scene='必要的操作演示。',dynamic='播放、暂停等使用原生播放器能力。',limit='不发明 autoplay、controls、poster 属性；圆角裁剪及比例需端侧测试。',requirements=['提供 res://template_video；资源未随包提供','媒体解码与权限'])
add('AudioPlayer',dict(id='focus',component='AudioPlayer',url=path('/assets/audio'),description='聚会准备说明',styles={'width':'100%'}),data={'assets':{'audio':'res://template_audio'}},scene='语音说明，文字摘要仍应保留。',dynamic='播放器提供播放进度；不等于通用 ProgressBar。',limit='不新增录音、自动播放等未声明字段。',requirements=['提供 res://template_audio；资源未随包提供','媒体解码与权限'])
add('Row',row('focus',['label','value'],justify='spaceBetween'),deps=[tx('label','预计人数'),tx('value','3 人','section')],variants={'titleGroup':{'focus':{'justify':'start','align':'center'}},'actions':{'focus':{'justify':'center','styles':{'gap':vp(12),'flex-wrap':'wrap'}}}},scene='短标签与值、图标与标题、短操作组。',dynamic='展示子节点的变化，不替代数据计算。',limit='长标签改纵向；不通过缩小字号强行一行；禁止价格和单位异常拆行。')
add('Column',col('focus',['heading','paragraph']),deps=[tx('heading','🥘 人数与用量','section'),tx('paragraph','先按 3 人准备，可按到场人数调整。')],variants={'tight':{'focus':{'styles':{'gap':vp(8)}}},'section':{'focus':{'styles':{'gap':vp(16)}}}},scene='页面和区域的主布局。',dynamic='追加区域时保留原引用；不覆盖已显示输入。',limit='不默认在每个 Column 加背景圆角，避免多层卡片壳。')
add('Card',card('focus','body'),deps=[tx('heading','🥘 食材用量','section'),tx('bodytext','数据为界面联调示例，实际按食量调整。'),col('body',['heading','bodytext'])],variants={'result':{'focus':{'styles':{'background-color':C['tint']}}},'spacious':{'focus':{'styles':{'padding':pad(24,24,24,24)}}},'glass':{'focus':{'styles':{'background-color':'rgba(255,255,255,0.96)'}}}},scene='一个主要任务区只用一层卡片外壳。',dynamic='内部可组合输入和结果。',limit='玻璃变体仅在已有合格背景图上使用；不加未支持 blur/backdrop-filter；完整信息不能硬裁剪。')
add('List',dict(id='focus',component='List',direction='vertical',children={'path':'/items','componentId':'item'},styles={'width':'100%'}),deps=[tx('item_name',path('name')),tx('item_amount',path('amount'),'hint'),dict(id='item_done',component='CheckBox',label='已采购',value=path('done')),col('item',['item_name','item_amount','item_done'],8,padding=pad(12,0,12,0))],data={'items':[{'id':'beef','name':'牛肉','amount':'演示：450 g','done':False},{'id':'veg','name':'蔬菜','amount':'演示：600 g','done':False}]},scene='同类信息重复、每项独立采购状态。',dynamic='模板内部使用相对路径；每个条目独立写回。',limit='输入列表的后续结构更新不可重置已勾选状态；不承诺拖拽、侧滑、分页。')
add('Tabs',dict(id='focus',component='Tabs',tabs=[{'title':'食材','child':'tab1'},{'title':'安排','child':'tab2'}],styles={'width':'100%'}),deps=[tx('t1','肉类、蔬菜与主食分组准备。'),col('tab1',['t1'],12,padding=pad(12,0,12,0)),tx('t2','先确认人数，再采购易耗食材。'),col('tab2',['t2'],12,padding=pad(12,0,12,0))],scene='同一任务的并列视图，项目建议 2–4 个短标签。',dynamic='页签切换由原生组件完成。',limit='没有获准的选中索引字段或回调时不生成；不要把必须操作的内容隐藏得难找。')
add('Modal',dict(id='focus',component='Modal',trigger='trigger',content='modalbody'),deps=[tx('trigger','查看用量说明','body',styles={'color':C['accent'],'text-decoration-line':'underline','min-height':vp(48)}),tx('mh','用量说明','section'),tx('mt','此页按演示数据展示配量。实际按食量和忌口调整。'),col('modalbody',['mh','mt'],12,padding=pad(24,24,24,24))],scene='次要说明，不隐藏核心结果。',dynamic='通过官方 trigger/content 打开；关闭、焦点和遮罩由宿主。',limit='示例以 Text 作为 trigger，触发效果需目标端验证；不编造 noop/openModal 动作；弹层外壳圆角由宿主主题负责。')
label=tx('button_label','按当前条件生成清单','button',styles={'text-align':'center'})
add('Button',bt('focus','button_label'),deps=[label],variants={'secondary':{'focus':{'variant':'default','styles':{'background-color':C['surface'],'border-color':C['primary'],'border-width':vp(1)}},'nodes':{'button_label':{'styles':{'color':C['primary']}}}},'text':{'focus':{'variant':'borderless','styles':{'background-color':'#FFFFFF00'}},'nodes':{'button_label':{'styles':{'color':C['accent']}}}}},scene='主操作、次操作、文字操作；同一区域建议最多一个主操作。',dynamic='本例调用你宿主已声明的 sendMsgToXiaoyi；点击时执行。',limit='动作是项目宿主扩展，不冒充官方内置；不可把颜色写到 Button 当文字色；禁用/加载态交给实际支持接口。',requirements=['宿主注册 sendMsgToXiaoyi；按当前契约执行','样式按48vp目标输出；真实触控区域仍需端侧量测'])
add('TextField',dict(id='focus',component='TextField',label='聚餐主题',variant='shortText',value=path('/form/name'),styles={'width':'100%'}),data={'form':{'name':'周末火锅'}},variants={'multiline':{'focus':{'variant':'longText'}},'numberDraft':{'focus':{'variant':'number'}},'password':{'focus':{'variant':'obscured'}}},scene='输入值，必须有清楚的可见标签。',dynamic='value 为可写字符串路径；number 外观仍是字符串。',limit='数字变体样例值需换为合法数字字符串后使用；不伪造 placeholder、onChange、error 等字段；内部文字与边框由主题决定。')
add('CheckBox',dict(id='focus',component='CheckBox',label='蔬菜已采购',value=path('/form/done'),styles={'width':'100%','min-height':vp(48)}),data={'form':{'done':False}},scene='独立布尔状态、任务完成状态。',dynamic='写回 boolean；与另一项状态独立。',limit='颜色之外保留勾选/文字反馈；不把 true/false 写为字符串；点击热区需原生验收。')
add('Slider',dict(id='focus',component='Slider',label='每人肉量（g，演示参数）',min=100,max=500,value=path('/form/amount'),styles={'width':'100%'}),data={'form':{'amount':250}},scene='允许连续变化的数值；整数人数优先离散选择器。',dynamic='绑定 number；派生结果由已注册纯函数执行。',limit='不发明 step、轨道色、thumbColor；不能仅用格式化取整保证实际人数是整数。')
add('ChoicePicker',dict(id='focus',component='ChoicePicker',label='需要照顾的口味',variant='multipleSelection',displayStyle='chips',filterable=False,options=[{'label':'🥬 多些蔬菜','value':'vegetables'},{'label':'🍲 清淡锅底','value':'mild'}],value=path('/form/preferences'),styles={'width':'100%'}),data={'form':{'preferences':['mild']}},variants={'single':{'focus':{'variant':'mutuallyExclusive','displayStyle':'checkbox'}},'checkbox':{'focus':{'displayStyle':'checkbox'}}},scene='有限选项、清楚取舍；标签短，业务 value 稳定。',dynamic='单选和多选都写 string[]。',limit='不支持选项私有样式时不得强加；无特殊需求与其他项互斥是业务规则，不是控件自动保证。')
add('DateTimeInput',dict(id='focus',component='DateTimeInput',label='开锅时间（请自行选择）',value=path('/form/when'),enableDate=True,enableTime=True,styles={'width':'100%'}),data={'form':{'when':''}},variants={'dateOnly':{'focus':{'enableDate':True,'enableTime':False}},'timeOnly':{'focus':{'enableDate':False,'enableTime':True}}},scene='有实际用途的日期或时间。',dynamic='ISO 字符串；不填未知日期。',limit='默认不使用项目专有 styles.compact；需要时单独启用并实测时区、显示和键盘。')
add('Table',dict(id='focus',component='Table',columns=['项目','3 人演示量'],rows=[['肉类合计','750 g'],['蔬菜','600 g'],['饮料','1.5 L']],styles={'width':'100%'}),scene='少列对比或紧凑静态数据清单。',dynamic='本基线 columns/rows 是静态数组，变更需结构更新，不假装路径绑定。',limit='默认建议 2–4 列；单元格不是任意组件；内部字号、单元格样式未开放时由主题决定。')
add('Carousel',dict(id='focus',component='Carousel',content=['https://example.invalid/agenui/template-cover.png','https://example.invalid/agenui/template-detail.png'],autoplay=False,draggable=True,styles={'width':'100%','aspect-ratio':'3/2','border-radius':vp(8)}),scene='确有多张相关图片且用户需要浏览。',dynamic='手动翻页；不自动轮播抢焦点。',limit='只保证图片数组入口；不假设任意组件子树轮播。',requirements=['以已核验可访问的无凭据HTTPS直链替换两个example.invalid离线fixture；素材未随包提供'])
add('Web',dict(id='focus',component='Web',url='https://genui.amap.com/',styles={'width':'100%','height':vp(320),'border-radius':vp(8)}),scene='必须嵌入已有网页时。',dynamic='网页内部交互属于 WebView。',limit='只用 url，不用文档旧例 source/html；外部网页内字体颜色不受本样式保证；无通用 DataModel 桥接保证。',requirements=['网络和 WebView 兼容性/域名策略'])
add('RichText',dict(id='focus',component='RichText',text='<p><b>准备提醒</b></p><p>先确认人数与忌口，再确定采购份量。</p>',variant='body',linksEnable=False,styles={'width':'100%'}),scene='必要的短富文本段落。',dynamic='可绑定 HTML 内容；链接只在需要时启用。',limit='不写 Text 的 font-size/line-clamp；原生默认字号按宿主主题校准。HTML 不等于完整网页脚本。')
add('Chart',dict(id='focus',component='Chart',chartType='bar',data={'xAxis':['肉类','蔬菜','豆制品'],'series':[{'name':'演示量（g）','data':[{'value':750},{'value':600},{'value':450}]}]},styles={'width':'100%','height':vp(220)}),variants={'line':{'focus':{'chartType':'line'}},'donut':{'focus':{'chartType':'donut','data':{'series':[{'name':'占比','data':[{'label':'肉类','value':750},{'label':'蔬菜','value':600},{'label':'豆制品','value':450}]}]}}}},scene='确需看分布/趋势才用；配文字结论和单位。',dynamic='数值是演示数据，不等于能任意绑定；当前模板测试结构。',limit='官方 Playground 扩展，默认关闭；不发明 tooltip/formatter/seriesColors/bar_grouped。',requirements=['宿主注册官方 Chart 扩展并启用 profile'])
add('Markdown',dict(id='focus',component='Markdown',content='### 准备事项\n\n- 确认人数与忌口\n- 按到场人数更新用量\n- 分批采购\n\n**说明：** 本内容用于样式联调。',styles={'width':'100%'}),scene='代码、列表等结构较复杂的说明。',dynamic='content 可由已允许的数据更新变化。',limit='官方扩展默认关闭；内部 h1/h2/代码色须渲染器主题适配，不能通过 Text.styles 冒充控制。',requirements=['宿主注册官方 Markdown 扩展并启用 profile'])
add('Lottie',dict(id='focus',component='Lottie',url=path('/assets/lottie'),loop=False,autoPlay=False,variant='small',styles={'width':vp(48),'height':vp(48)}),data={'assets':{'lottie':'res://template_animation'}},scene='低干扰、可省略的状态动效。',dynamic='播放机制由扩展组件；本例关闭循环和自动播放。',limit='非必要动效默认关闭；减少动态效果设置需要宿主落实；不表示真正的业务进度。',requirements=['宿主注册官方 Lottie 扩展并启用 profile','提供 res://template_animation，资源未随包提供'])

# A practical composition: integer people selector + real quantity dependency.
sid='hotpot_style_composition'
calc=fn('calculateNumber',{'left':path('/form/perPerson'),'right':3,'operator':'multiply'},'number')
part1=[tx('hero','🥘 火锅准备','group'),tx('intro','3 人已确定；调节每人肉量，合计即时计算。','hint'),dict(id='quantity',component='Slider',label='每人肉量（g）',min=100,max=500,value=path('/form/perPerson'),styles={'width':'100%'}),tx('total_label','肉类合计（g）','hint'),tx('total',fn('formatNumber',{'value':calc,'decimals':0,'grouping':False},'string'),'metric'),col('pbody',['hero','intro','quantity','total_label','total']),card('parameter_card','pbody')]
part2=[tx('h2','📝 补充要求','section'),dict(id='needs',component='ChoicePicker',label='需要照顾的口味',variant='multipleSelection',displayStyle='chips',options=[{'label':'清淡','value':'mild'},{'label':'多蔬菜','value':'veg'}],value=path('/form/needs')),tx('action_label','按当前条件继续','button',styles={'text-align':'center'}),{**bt('submit','action_label'),'action':action(fn('formatString',{'value':'3 人聚餐，每人肉量 ${/form/perPerson} 克，请继续生成采购清单。'},'string'))},col('extra_body',['h2','needs','submit']),card('extra_card','extra_body')]
stream=[msg('createSurface',{'surfaceId':sid,'catalogId':catalog_id}),msg('updateDataModel',{'surfaceId':sid,'path':'/form/perPerson','value':250}),msg('updateComponents',{'surfaceId':sid,'components':part1+[root(['parameter_card'])]}),msg('updateDataModel',{'surfaceId':sid,'path':'/form/needs','value':[]}),msg('updateComponents',{'surfaceId':sid,'components':part2+[root(['parameter_card','extra_card'])]})]
nd('examples/hotpot_composition.ndjson',stream)
# Check the confirmed host's vp/unitless-string equivalence; no guessed px multiplier.
calnodes=[]; calgroups=[]
for v in [16,32,48]:
 label=f'label{v}'; squares=f'squares{v}'; group=f'group{v}'
 calnodes.append(tx(label,f'{v}vp 与无单位字符串 {v} 的等价核对','hint'))
 for suffix,value in [('explicit',f'{v}vp'),('unitless',str(v))]:
  calnodes.append(dict(id=f'square{v}_{suffix}',component='Column',children=[],styles={'width':value,'height':value,'background-color':'#D5DAE0'}))
  calnodes.append(tx(f'text{v}_{suffix}','字号等价核对','body',styles={'font-size':value}))
 calnodes.append(row(squares,[f'square{v}_explicit',f'square{v}_unitless']))
 calnodes.append(col(group,[label,squares,f'text{v}_explicit',f'text{v}_unitless']))
 calgroups.append(group)
calnodes.append(root(calgroups))
nd('examples/unit_calibration.ndjson',[msg('createSurface',{'surfaceId':'unit_calibration','catalogId':catalog_id}),msg('updateComponents',{'surfaceId':'unit_calibration','components':calnodes})])

semantic={role:{'logicalSize':n,'designUnit':'vp','fontScalingNote':'默认字体比例下的逻辑字号；系统大字体和无障碍缩放由宿主实现并单独验收','weightProject':w,'colorRole':c,'a2uiVariant':v} for role,(n,w,c,v) in roles.items()}
tokens={'version':'draft-1.1-vp','type':'project-design-tokens-not-A2UI-theme-schema','designAuthority':'HarmonyOS 手机设计层级＋AGenUI 能力映射；下列组合为项目方案',
 'colors':{'light':C,'dark':D},'typography':semantic,'spacingLogical':[4,8,12,16,24,32], 'radiusLogical':{'tag':4,'image':8,'card':16,'button':20,'modalHost':32},
 'density':{'compact':{'pageInset':16,'cardInset':16,'groupGap':12,'sectionGap':16},'spacious':{'pageInset':24,'cardInset':24,'groupGap':16,'sectionGap':24}},
 'unitMapping':{'unit':'vp','unitlessDefault':'vp','valueType':'string','preferredOutput':'explicit-vp-string','lengthScale':S,'fontScale':F,'semanticsConfirmed':True,'confirmationBasis':'用户已确认当前端侧支持vp，尺寸字符串无单位时默认vp；项目宿主约定优先于上游px描述','nativeVisualQA':False,'accessibilityFontScaleQA':False,'warning':'已撤销旧2倍输出候选；默认直接输出设计逻辑值。此确认不代表真机视觉或系统大字体验收完成；显式项目缩放参数不是单位换算。'},
 'officialAGenUIFontReferenceOnly':{'globalHeading':'40px','sectionHeading':'36px','body':'32px','small':'28px','tagFootnote':'24px'},
 'overrides':{'fontScalePolicy':'本项目选用鸿蒙手机语义层级，不机械沿用 AGenUI Skill 固定五档字号；不是二者天然等价。','pageStructure':'自由组合组件；不采用摘要卡固定骨架覆盖所有任务。','online':'绑定前初始化，逐区域输出；不复制官方离线先结构后数据写文件流程。'}}
dump('visual-tokens.json',tokens)
dump('templates/index.json',{'status':'candidate','components':[{'name':t['component'],'id':t['templateId'],'file':t['component']+'.json','variants':list(t['variants']),'conditional':t['component'] in ['Chart','Markdown','Lottie']} for t in T]})
# Record chosen profile independently; does not register real client components.
dump('validation/default-profile.json',base)
ext=copy.deepcopy(base);ext['components']+=['Chart','Markdown','Lottie'];dump('validation/catalog-all25-profile.json',ext)
# Contrast values; no inaccessible screenshots represented as validation.
def lin(n):
 n=n/255;return n/12.92 if n<=.04045 else ((n+.055)/1.055)**2.4
def lum(h):return sum(w*lin(int(h[i:i+2],16)) for i,w in zip([1,3,5],[.2126,.7152,.0722]))
def contrast(a,b):
 x,y=sorted([lum(a),lum(b)],reverse=True);return (x+.05)/(y+.05)
contr=[]
for theme,colors in [('light',C),('dark',D)]:
 for foreground,background in [('primary','surface'),('secondary','surface'),('muted','surface'),('accent','surface'),('onAction','action'),('error','surface'),('inputBorder','surface')]:
  v=contrast(colors[foreground],colors[background]);contr.append({'theme':theme,'foreground':foreground,'background':background,'ratio':round(v,3),'target':3 if foreground=='inputBorder' else 4.5,'pass':v>(3 if foreground=='inputBorder' else 4.5)})
dump('validation/contrast-report.json',{'method':'sRGB relative luminance; only listed opaque color pairs; not native screenshots, overlays or charts','results':contr})
# Metadata indexes generated examples.
dump('manifest.json',{'type':'Skill visual-reference pack','originalSkillModified':False,'sourceCatalogSha256':hashlib.sha256((K/'vendor/agenui_catalog.json').read_bytes()).hexdigest(),'pinnedOfficialCommit':'5c347a8352c1afff31879bcf5af4101df4f94137','protocol':'v0.9','catalogId':base['catalogId'],'templates':len(T),'baseComponents':22,'conditionalComponents':['Chart','Markdown','Lottie'],'sampleScale':{'layout':S,'font':F},'unitProfile':{'unit':'vp','unitlessDefault':'vp','valueType':'string','semanticsConfirmed':True,'confirmationBasis':'用户确认当前端侧约定；不是上游官方vp能力声明','nativeVisualQA':False,'accessibilityFontScaleQA':False},'sourceDate':'2026-11-17','updatedDate':'2026-11-18','runtimeTests':False})
print('generated',len(T),'templates;',sum(len(t['variants']) for t in T),'alternative variants')
print('contrast checks',len(contr), 'pass',sum(x['pass'] for x in contr))

# Refresh generated focus snippets when the prose directory is present in the output pack.
directory=O/'02_组件模板目录.md'
if directory.exists():
 by_component={t['component']:t['focus'] for t in T}
 def sync_focus(match):
  value=json.loads(match.group(1))
  if not isinstance(value,dict) or value.get('id')!='focus' or value.get('component') not in by_component:return match.group(0)
  return '```json\n'+json.dumps(by_component[value['component']],ensure_ascii=False,indent=2)+'\n```'
 directory.write_text(re.sub(r'```json\n(.*?)\n```',sync_focus,directory.read_text(encoding='utf-8'),flags=re.S),encoding='utf-8')
