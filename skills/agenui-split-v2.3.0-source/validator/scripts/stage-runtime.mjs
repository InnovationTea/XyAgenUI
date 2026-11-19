// Build a runtime-only deployment directory. No sibling Skill, dev fixtures or model templates are read.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {contractStamp, loadCatalog} from './lib/index.mjs';

const from = fileURLToPath(new URL('../', import.meta.url));
const {values,positionals} = parseArgs({allowPositionals:true, options:{'with-deps':{type:'boolean',default:false}}});
if(positionals.length!==1) throw Error('用法：node scripts/stage-runtime.mjs <新建的空目录> [--with-deps]');
const out=path.resolve(positionals[0]);
const fromRoot=path.resolve(from);
if(out===fromRoot || out.startsWith(fromRoot+path.sep))throw Error('请选择 validator 源码目录以外的输出位置');
if(fs.existsSync(out) && (fs.lstatSync(out).isSymbolicLink() || !fs.statSync(out).isDirectory() || fs.readdirSync(out).length))
  throw Error('目标必须是新目录或空目录，不覆盖原文件');
const components=['contract','vendor','package-lock.json','docs/SERVICE.md','docs/AGENT-INTEGRATION.md','integrations/python_agent.py',
  'scripts/service.mjs','scripts/cli.mjs','scripts/online.mjs',
  ...['catalog','contract-stamp','expressions','index','json','session','stream','validator'].map(n=>'scripts/lib/'+n+'.mjs')];
if(values['with-deps'])components.push('node_modules');
// Fail before creating output when required source files or offline dependencies are missing.
for(const name of components)fs.accessSync(path.join(from,name));
const stamp=contractStamp(loadCatalog());
const pkg=JSON.parse(fs.readFileSync(path.join(from,'package.json'),'utf8'));
pkg.scripts={start:'node scripts/service.mjs',online:'node scripts/online.mjs'};
fs.mkdirSync(out,{recursive:true});
for(const name of components){
  const dest=path.join(out,name); fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.cpSync(path.join(from,name),dest,{recursive:true,verbatimSymlinks:true});
}
fs.mkdirSync(path.join(out,'generated'));
fs.writeFileSync(path.join(out,'generated/contract-stamp.json'),JSON.stringify(stamp,null,2)+'\n');
fs.writeFileSync(path.join(out,'package.json'),JSON.stringify(pkg,null,2)+'\n');
fs.writeFileSync(path.join(out,'README.md'),[
  '# AGenUI 独立校验服务 · 运行版','',
  '在本目录以 Node.js 22+ 启动：'+(values['with-deps']?'离线包已附带锁定依赖，直接执行 `npm start`。':'先执行 `npm ci`，再执行 `npm start`。'),
  '默认地址：`http://127.0.0.1:8080`。健康检查：`GET /healthz`。无需同机安装 Skill 或访问模型服务。','',
  '接口、顺序、错误与资源上限见 [SERVICE.md](docs/SERVICE.md)；Python Agent 接入及回放示例见 [AGENT-INTEGRATION.md](docs/AGENT-INTEGRATION.md)。',
  '运行包不含测试、样式配方、构建工具或模型 Skill。修改能力、重新导出或开发测试请使用双目录源码包。','',
  '会话为单实例内存状态；正式跨机器接入时，由网关提供鉴权与安全通道，同一回复的各次请求需要命中同一实例。',''
].join('\n'));
console.log(JSON.stringify({runtime:out,withDependencies:values['with-deps'],contractSha256:stamp.contractSha256}));
