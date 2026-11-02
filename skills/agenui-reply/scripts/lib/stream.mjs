import { loadCatalog } from './catalog.mjs';
import { componentRefs, validateMessages } from './validator.mjs';

export function streamMessages(messages, regions, options = {}) {
  const env = options.env || loadCatalog(options.profile);
  const fail = message => { const error = new Error(message); error.contentError = true; throw error; };
  const originals = validateMessages(messages, { ...options, env, surface: 'existing' });
  if (!originals.valid) fail(`输入未通过校验：${JSON.stringify(originals.diagnostics)}`);
  const updates = messages.filter(m => m.updateComponents);
  if (updates.length !== 1 || messages.some(m => !m.updateComponents && !m.updateDataModel && !m.createSurface)) fail('stream 输入应包含一条完整 updateComponents 和初始化数据');
  const body = updates[0].updateComponents;
  if (messages.some(m => Object.values(m).some(v => v && typeof v === 'object' && v.surfaceId && v.surfaceId !== body.surfaceId))) fail('stream 每次只处理一个 Surface');
  const nodes = new Map(body.components.map(n => [n.id, n]));
  const root = nodes.get('root');
  if (root?.component !== 'Column' || !Array.isArray(root.children)) fail('stream 首版要求 root 为静态 Column.children；复杂结构请直接编写 NDJSON');
  if (!Array.isArray(regions) || !regions.length || regions.some(r => !Array.isArray(r) || !r.length || r.some(id => typeof id !== 'string'))) fail('regions 应为非空的组件 ID 二维数组');
  const flattened = regions.flat();
  if (new Set(flattened).size !== flattened.length || JSON.stringify(flattened) !== JSON.stringify(root.children)) fail('regions 必须按 root.children 原顺序完整分组，不能遗漏、重复或重排');
  const result = [];
  if ((options.surface || 'existing') === 'new') result.push(structuredClone(messages.find(m => m.createSurface) || { version: 'v0.9', createSurface: { surfaceId: body.surfaceId, catalogId: env.profile.catalogId } }));
  else if (options.surface && options.surface !== 'existing') throw new Error('surface 必须为 existing 或 new');
  result.push(...messages.filter(m => m.updateDataModel).map(m => structuredClone(m)));
  const sent = new Set(), visible = [];
  for (const region of regions) {
    const components = [];
    function include(id) {
      if (sent.has(id)) return;
      if (id === 'root') fail('区域依赖不可回指 root');
      for (const ref of componentRefs(nodes.get(id))) include(ref);
      sent.add(id); components.push(structuredClone(nodes.get(id)));
    }
    for (const id of region) include(id);
    visible.push(...region);
    components.push({ ...structuredClone(root), children: [...visible] });
    result.push({ version: 'v0.9', updateComponents: { surfaceId: body.surfaceId, components } });
  }
  if (sent.size !== nodes.size - 1) fail('完整消息包含 root 不可达组件，不能无损分批；请移除无用组件或自行组织 NDJSON');
  const checked = validateMessages(result, { ...options, env });
  if (!checked.valid) fail(`分批结果未通过校验：${JSON.stringify(checked.diagnostics)}`);
  return result;
}
