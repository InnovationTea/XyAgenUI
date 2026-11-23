import { writeArtifact as write } from '../authoring/output.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { validatorRoot, readJson, loadCatalog } from './lib/catalog.mjs';
import { expandTemplate, loadVisualProfile, rootStyle } from './lib/styles.mjs';
const { values } = parseArgs({ options: { visual: { type: 'string' } } });
const profile = loadVisualProfile(values.visual), env = loadCatalog();
const index = [];
for (const file of fs.readdirSync(path.join(validatorRoot, 'authoring/styles/recipes')).filter(f => f.endsWith('.json')).sort()) {
  const name = path.basename(file, '.json'), source = readJson('authoring/styles/recipes/' + file);
  const variants = ['default', ...Object.keys(source.variants)];
  if (name === 'Text') variants.push('summary');
  if (name === 'Column') variants.push('root');
  const entries = Object.fromEntries(variants.map(v => [v, expandTemplate(name, v, profile)]));
  const payload = { component: name, status: 'vp-contract-confirmed-no-native-test', enabledByDefault: env.profile.components.includes(name), visualProfile: profile,
    usage: source.scene, interaction: source.dynamicContract, boundary: source.boundary,
    outputRule: '只使用选中 variant 的 focus / dependencies 组件；模板元信息不进入 A2UI。ID、绑定、内容和动作按任务替换。初始化逐路径、在绑定前。',
    variants: entries };
  if (entries.default.resourceRequired) payload.resourceRule = 'example.invalid 仅离线测试；真实回复必须替换为已确认资源。Image/Carousel 为字面量 HTTPS；没有资源则不用该组件。';
  write(`styles/templates/${name}.json`, payload);
  for (const [variant, entry] of Object.entries(entries)) {
    const surfaceId = `sample_${name.toLowerCase()}_${variant.toLowerCase()}`;
    const messages = [{ version: 'v0.9', createSurface: { surfaceId, catalogId: env.profile.catalogId } }];
    if (Object.keys(entry.initialData).length) messages.push({ version: 'v0.9', updateDataModel: { surfaceId, path: '/', value: entry.initialData } });
    messages.push({ version: 'v0.9', updateComponents: { surfaceId, components: [...entry.dependencies, entry.focus, { id: 'root', component: 'Column', children: ['focus'], styles: rootStyle(profile) }] } });
    const folder = variant === 'default' ? 'components' : 'variants';
    const target = `examples/${folder}/${name}${variant === 'default' ? '' : '.' + variant}.ndjson`;
    write(target, messages.map(m => JSON.stringify(m)).join('\n') + '\n');
  }
  index.push({ component: name, enabled: payload.enabledByDefault, file: `templates/${name}.json`, variants, resourceRequired: entries.default.resourceRequired });
}
write('styles/index.json', { profile, components: index });
write('styles/INDEX.md', `# 组件样式索引\n\n本次生成使用 ${profile.theme}/${profile.density}，布局比例 ${profile.lengthScale}、字体比例 ${profile.fontScale}，单位 **vp（无单位长度默认vp，用户已确认）**，真机视觉 **${profile.nativeVisualVerified ? '已记录端侧验收' : '待端侧验收'}**。这是项目数据，不是 Theme API 参数。\n\n按需读取一种组件的模板；variant 已展开，不由模型深合并。模板的 focus/dependencies 是组件片段；examples 才是完整消息。模板不固定页面结构。\n\n|组件|默认启用|变体|\n|---|---|---|\n` + index.map(i => `|[${i.component}](${i.file})|${i.enabled ? '是' : '否，需宿主注册'}|${i.variants.join(' / ')}|`).join('\n') + '\n\n资源组件含离线占位地址，禁止原样发送给用户。活动默认主题和密度由维护者构建；默认比例1/1，按vp设计值直出，不让模型换算屏幕密度。\n');
write('generated/visual-build.json', { profile, source: 'styles/recipes + styles/tokens.json', templates: index.length, expandedVariants: index.reduce((n, i) => n + i.variants.length, 0) });
console.log(`视觉资源：${index.length} 种组件，${index.reduce((n, i) => n + i.variants.length, 0)} 个完整变体`);
