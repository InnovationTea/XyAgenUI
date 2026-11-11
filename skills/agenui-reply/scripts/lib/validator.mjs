import { loadCatalog, propertiesOf, dynamicType } from './catalog.mjs';
import { parseTemplate } from './expressions.mjs';

export const escapePointer = s => String(s).replaceAll('~', '~0').replaceAll('/', '~1');
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const missing = Symbol('missing');
const emptyTemplate = Symbol('empty-template');
const inputNames = new Set(['Slider', 'ChoicePicker', 'TextField', 'CheckBox', 'DateTimeInput']);
const types = value => Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
function positiveImageWidth(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d+(?:\.\d+)?)(px|%)?$/.exec(value);
  return Boolean(match && Number(match[1]) > 0);
}
function isHttpsUrl(value) {
  if (typeof value !== 'string' || value.includes('${')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}
function backgroundUrl(value) {
  if (typeof value !== 'string') return undefined;
  const match = /^url\(\s*(?:(['"])(.*?)\1|([^)]*))\s*\)$/i.exec(value);
  return match ? (match[2] ?? match[3]).trim() : undefined;
}
function isoInput(value) {
  if (value === '') return true;
  if (typeof value !== 'string') return false;
  const date = part => {
    const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(part);
    if (!m) return false;
    const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return month >= 1 && month <= 12 && day >= 1 && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  };
  const time = part => /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/.test(part);
  const parts = value.split('T');
  return parts.length === 2 ? date(parts[0]) && time(parts[1]) : parts.length === 1 && (date(value) || time(value));
}
export function pathParts(pointer, relative = false) {
  if (typeof pointer !== 'string' || !pointer || /~(?![01])/.test(pointer) || (!relative && !pointer.startsWith('/'))) throw new Error('使用 / 分隔的 JSON Pointer；普通绑定必须为绝对路径，模板内部使用相对路径');
  if (pointer === '/') return [];
  const parts = (pointer.startsWith('/') ? pointer.slice(1) : pointer).split('/').map(s => s.replaceAll('~1', '/').replaceAll('~0', '~'));
  if (parts.some(p => !p || ['__proto__', 'constructor', 'prototype'].includes(p))) throw new Error('路径包含空段或不允许的字段');
  return parts;
}
function getValue(data, parts) {
  let value = data;
  for (const part of parts) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) return missing;
    value = value[part];
  }
  return value;
}
function setValue(data, parts, value) {
  if (!parts.length) return structuredClone(value);
  if (!object(data) && !Array.isArray(data)) data = {};
  let parent = data;
  for (const part of parts.slice(0, -1)) {
    if (!object(parent[part]) && !Array.isArray(parent[part])) parent[part] = {};
    parent = parent[part];
  }
  parent[parts.at(-1)] = structuredClone(value);
  return data;
}
export function componentRefs(component) {
  const refs = [];
  if (Array.isArray(component.children)) refs.push(...component.children);
  else if (object(component.children) && typeof component.children.componentId === 'string') refs.push(component.children.componentId);
  if (typeof component.child === 'string') refs.push(component.child);
  if (component.component === 'Tabs') for (const tab of component.tabs || []) if (typeof tab.child === 'string') refs.push(tab.child);
  if (component.component === 'Modal') for (const key of ['trigger', 'content']) if (typeof component[key] === 'string') refs.push(component[key]);
  return refs;
}

export function parseMessages(text, format = 'auto') {
  text = text.replace(/^\uFEFF/, '');
  try {
    if (format !== 'ndjson') {
      try { const value = JSON.parse(text); return { messages: Array.isArray(value) ? value : [value], diagnostics: [] }; }
      catch (error) { if (format === 'json') throw error; }
    }
    const messages = [];
    for (const [line, raw] of text.split(/\r?\n/).entries()) {
      if (!raw.trim()) continue;
      try { const value = JSON.parse(raw); if (!object(value)) throw new Error('每行必须是一条消息对象'); messages.push(value); }
      catch { return { messages: [], diagnostics: [{ code: 'E_PARSE', message: `第 ${line + 1} 行不是完整 JSON 消息，请使用标准双引号、转义字符串换行并检查是否截断`, index: messages.length + 1, pointer: '', line: line + 1 }] }; }
    }
    if (!messages.length) throw new Error('输入为空');
    return { messages, diagnostics: [] };
  } catch { return { messages: [], diagnostics: [{ code: 'E_PARSE', message: '输入不是完整 JSON 消息，请使用标准双引号、转义字符串换行并检查格式或截断', index: 1, pointer: '' }] }; }
}

export function validateMessages(messages, options = {}) {
  const env = options.env || loadCatalog(options.profile);
  const { profile, catalog } = env;
  const mode = options.surface || 'existing';
  if (!['existing', 'new'].includes(mode)) throw new Error('surface 必须为 existing 或 new');
  if (!Array.isArray(messages)) throw new Error('validateMessages 需要消息数组');
  if (options.state !== undefined && (!object(options.state) || Object.values(options.state).some(v => !object(v)))) throw new Error('state 必须为按 surfaceId 映射的数据对象');
  const diagnostics = [];
  const surfaces = new Map();
  let index = 0;
  let sourceIndex;
  const report = (code, message, pointer = '') => diagnostics.push({ code, message, index: sourceIndex ?? index, pointer });
  const checkSchema = (validate, value, prefix, code) => {
    if (validate(value)) return;
    const errors = validate.errors || [];
    // Keep actionable property/required/type failures instead of thousands of union alternatives.
    const details = errors.filter(e => !['oneOf', 'anyOf', 'if'].includes(e.keyword)).slice(0, 4);
    for (const e of details) report(code, `字段不符合协议：${e.keyword} ${JSON.stringify(e.params)}`, prefix + e.instancePath);
  };
  const stateFor = id => ({ components: new Map(), origins: new Map(), data: structuredClone(options.state?.[id] ?? {}), inputPaths: new Set(), touched: false });

  function inspectSurface(surface, base) {
    const nodes = surface.components;
    const active = new Set(), visited = new Set();
    function graph(id) {
      const origin = surface.origins.get(id); sourceIndex = origin.index;
      if (active.has(id)) { report('E_CYCLE', `组件引用形成循环：${id}`, origin.pointer); return; }
      if (visited.has(id)) return;
      visited.add(id); active.add(id);
      for (const ref of componentRefs(nodes.get(id))) {
        sourceIndex = origin.index;
        if (!nodes.has(ref)) report('E_REFERENCE', `组件 ${id} 引用了不存在的组件 ${ref}`, origin.pointer);
        else graph(ref);
      }
      active.delete(id);
    }
    const beforeGraph = diagnostics.length;
    for (const id of nodes.keys()) graph(id);
    sourceIndex = undefined;
    if (diagnostics.length > beforeGraph) return;

    function expressionCall(value) {
      if (Array.isArray(value)) return value.map(expressionCall);
      if (!object(value)) return value;
      const normalized = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, expressionCall(v)]));
      if (typeof value.call === 'string' && catalog.functions[value.call]) normalized.returnType ??= catalog.functions[value.call].properties.returnType?.const ?? 'number';
      return normalized;
    }

    function resolve(pointer, context, at, expected) {
      let parts;
      try {
        parts = pathParts(pointer, context !== undefined);
        if (context !== undefined && pointer.startsWith('/')) throw new Error('模板组件内部使用相对路径');
      } catch (error) { report('E_PATH', error.message, at); return missing; }
      if (context === emptyTemplate) return missing;
      const value = getValue(context === undefined ? surface.data : context, parts);
      if (value === missing) report('E_INITIAL_VALUE', `绑定路径尚未初始化：${pointer}`, at);
      else if (expected && types(value) !== expected) report('E_VALUE_TYPE', `路径 ${pointer} 应绑定 ${expected}，实际为 ${types(value)}`, at);
      if (expected === 'array' && value !== missing && Array.isArray(value) && value.some(v => typeof v !== 'string')) report('E_VALUE_TYPE', `路径 ${pointer} 应为字符串数组`, at);
      return value;
    }

    function walk(value, schema, at, context, action = false, templateExpression = false) {
      if (typeof value === 'string') {
        try { for (const expression of parseTemplate(value)) walk(expression, undefined, at, context, false, true); }
        catch (error) { report('E_TEMPLATE', error.message, at); }
        return;
      }
      if (Array.isArray(value)) { value.forEach((v, i) => walk(v, schema?.items, `${at}/${i}`, context)); return; }
      if (!object(value)) return;
      if (typeof value.call === 'string') {
        const name = value.call;
        if (!profile.functions.includes(name)) { report('E_FUNCTION', `函数未启用或名称错误：${name}`, at); return; }
        if (env.actionNames.has(name) && !action) report('E_ACTION_POSITION', `动作 ${name} 仅能放在 action.functionCall，不能在值或模板中执行`, at);
        if (action && !profile.actions.includes(name)) report('E_ACTION_POSITION', `${name} 是值函数，不能作为动作`, at);
        const fnSchema = catalog.functions[name];
        const checked = templateExpression ? expressionCall(value) : value;
        checkSchema(env.fn(name), checked, at, 'E_FUNCTION_ARGS');
        const expected = dynamicType(schema), actual = checked.returnType ?? fnSchema.properties.returnType?.const;
        if (expected && actual && actual !== 'any' && actual !== expected) report('E_RETURN_TYPE', `函数 ${name} 返回 ${actual}，当前位置需要 ${expected}`, at);
        const props = fnSchema.properties.args?.properties || {};
        for (const [key, arg] of Object.entries(value.args || {})) walk(arg, props[key], `${at}/args/${escapePointer(key)}`, context, false, templateExpression);
        return;
      }
      if (Object.hasOwn(value, 'path') && !Object.hasOwn(value, 'componentId')) {
        resolve(value.path, context, `${at}/path`, dynamicType(schema)); return;
      }
      const props = propertiesOf(schema, catalog);
      for (const [key, child] of Object.entries(value)) {
        if (key === 'children' && object(child) && Object.hasOwn(child, 'componentId')) continue;
        if (key === 'event' && object(child) && !profile.events.includes(child.name)) report('E_EVENT', `事件未声明接收方：${child.name}`, `${at}/event`);
        walk(child, props[key], `${at}/${escapePointer(key)}`, context, key === 'functionCall' && at.endsWith('/action'));
      }
    }

    const reached = new Set();
    function inspect(id, context, stack = new Set()) {
      if (stack.has(id)) return;
      const nextStack = new Set(stack).add(id);
      reached.add(id);
      const node = nodes.get(id);
      const origin = surface.origins.get(id); sourceIndex = origin.index;
      const at = origin.pointer;
      walk(node, catalog.components[node.component], at, context);
      if (inputNames.has(node.component)) {
        if (!object(node.value) || typeof node.value.path !== 'string') report('E_INPUT_BINDING', `输入组件 ${id} 的 value 必须是可写路径绑定`, `${at}/value`);
        else {
          const expected = node.component === 'Slider' ? 'number' : node.component === 'ChoicePicker' ? 'array' : node.component === 'CheckBox' ? 'boolean' : 'string';
          const value = resolve(node.value.path, context, `${at}/value/path`, expected);
          if (context === undefined) surface.inputPaths.add(node.value.path);
          if (node.component === 'Slider' && (node.min ?? 0) > node.max) report('E_RANGE', '滑块最小值不能大于最大值', at);
          if (value !== missing && node.component === 'Slider' && (value < (node.min ?? 0) || value > node.max)) report('E_RANGE', '滑块初值超出范围', `${at}/value`);
          if (value !== missing && node.component === 'ChoicePicker' && Array.isArray(value)) {
            if ((node.variant ?? 'mutuallyExclusive') === 'mutuallyExclusive' && value.length > 1) report('E_SELECTION', '互斥选择最多一个值', `${at}/value`);
            if (new Set(value).size !== value.length || value.some(v => !node.options.some(o => o.value === v))) report('E_SELECTION', '选择值重复或不属于选项', `${at}/value`);
          }
          if (value !== missing && node.component === 'DateTimeInput' && !isoInput(value)) report('E_DATE', '日期/时间初值应为有效 ISO 8601 日期、时间、日期时间或空字符串', `${at}/value`);
        }
      }
      if (node.component === 'Table' && node.rows.some(row => row.length !== node.columns.length)) report('E_TABLE', '表格每行的单元格数必须与列数一致', at);
      for (const ref of componentRefs(node)) {
        if (object(node.children) && node.children.componentId === ref) {
          const items = resolve(node.children.path, context, `${at}/children/path`);
          if (items !== missing && !Array.isArray(items)) report('E_VALUE_TYPE', '模板 children.path 必须绑定数组', `${at}/children/path`);
          if (Array.isArray(items) && items.length) items.forEach(item => inspect(ref, item, nextStack));
          else inspect(ref, emptyTemplate, nextStack);
        } else inspect(ref, context, nextStack);
      }
    }
    if (nodes.has('root')) inspect('root', undefined);
    for (const id of nodes.keys()) if (!reached.has(id)) inspect(id, undefined);
    sourceIndex = undefined;
  }

  for (const message of messages) {
    index++;
    if (!object(message)) { report('E_MESSAGE', '消息必须是对象'); continue; }
    const operations = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'].filter(k => Object.hasOwn(message, k));
    if (message.version !== 'v0.9' || operations.length !== 1 || Object.keys(message).some(k => k !== 'version' && !operations.includes(k))) { report('E_MESSAGE', '每条消息必须包含 version:v0.9 和唯一操作'); continue; }
    const op = operations[0], body = message[op], base = `/${op}`;
    const allowed = { createSurface: ['surfaceId', 'catalogId', 'theme', 'sendDataModel'], updateComponents: ['surfaceId', 'components'], updateDataModel: ['surfaceId', 'path', 'value'], deleteSurface: ['surfaceId'] }[op];
    if (!object(body) || typeof body.surfaceId !== 'string' || !body.surfaceId.trim() || Object.keys(body).some(k => !allowed.includes(k))) { report('E_MESSAGE', '操作字段或 surfaceId 不合法', base); continue; }
    const id = body.surfaceId;
    if (op === 'createSurface') {
      if (surfaces.has(id)) report('E_SURFACE_EXISTS', `Surface 已存在：${id}`, base);
      else if (body.catalogId !== profile.catalogId || (body.theme !== undefined && !object(body.theme)) || (body.sendDataModel !== undefined && typeof body.sendDataModel !== 'boolean')) report('E_CATALOG', 'catalogId 或 Surface 配置不合法', base);
      else surfaces.set(id, stateFor(id));
      continue;
    }
    if (!surfaces.has(id)) {
      if (mode === 'new' || op === 'deleteSurface') { report('E_SURFACE_MISSING', `Surface 未创建：${id}`, base); continue; }
      surfaces.set(id, stateFor(id));
    }
    const surface = surfaces.get(id);
    if (op === 'deleteSurface') { surfaces.delete(id); continue; }
    if (op === 'updateDataModel') {
      if (!Object.hasOwn(body, 'value')) { report('E_MESSAGE', '缺少数据值 value', base); continue; }
      try {
        const parts = pathParts(body.path);
        const overwrites = [...surface.inputPaths].some(p => p === body.path || p.startsWith(body.path === '/' ? '/' : `${body.path}/`) || body.path.startsWith(`${p}/`));
        if (overwrites) report('E_STATE_RESET', '更新会覆盖已展示输入；初始化应在首次绑定前，重置请创建新 Surface', `${base}/path`);
        else surface.data = setValue(surface.data, parts, body.value);
      } catch (error) { report('E_PATH', error.message, `${base}/path`); }
      if (surface.components.size) inspectSurface(surface, '/components');
    } else {
      if (!Array.isArray(body.components) || !body.components.length) { report('E_COMPONENTS', 'components 必须为非空数组', `${base}/components`); continue; }
      const seen = new Set(); let valid = true;
      body.components.forEach((node, i) => {
        const at = `${base}/components/${i}`;
        if (!object(node) || typeof node.component !== 'string' || !profile.components.includes(node.component)) { report('E_COMPONENT', `组件未启用或不存在：${node?.component}`, at); valid = false; return; }
        const before = diagnostics.length;
        checkSchema(env.component(node.component), node, at, 'E_COMPONENT_SCHEMA');
        if (node.component === 'Text' && Number.isInteger(node.styles?.['line-clamp']) && node.styles['line-clamp'] <= 0) {
          report('E_TEXT_LINE_CLAMP', 'Text 的 line-clamp 必须为正整数；完整显示时省略该属性，摘要可使用 3', `${at}/styles/line-clamp`);
        }
        if (node.component === 'Image' && !positiveImageWidth(node.styles?.width)) {
          report('E_IMAGE_WIDTH', 'Image 必须在 styles.width 设置明确的正宽度，例如 100% 或 240px', `${at}/styles/width`);
        }
        if (node.component === 'Image') {
          if (!isHttpsUrl(node.url)) report('E_IMAGE_URL', 'Image URL 必须是明确的无凭据 HTTPS 直链；动态 URL 不可静态确认，域名是否有防盗链仍需核验', `${at}/url`);
        }
        if (node.component === 'Carousel' && Array.isArray(node.content)) {
          node.content.forEach((url, j) => {
            if (!isHttpsUrl(url)) report('E_IMAGE_URL', 'Carousel 图片 URL 必须是明确的无凭据 HTTPS 直链；动态 URL 不可静态确认，域名是否有防盗链仍需核验', `${at}/content/${j}`);
          });
        }
        const bgUrl = backgroundUrl(node.styles?.['background-image']);
        if (node.styles?.['background-image'] !== undefined && (bgUrl === undefined || !isHttpsUrl(bgUrl))) {
          report('E_IMAGE_URL', 'background-image 必须包含明确的 HTTPS URL；动态 URL 不可静态确认，域名是否有防盗链仍需核验', `${at}/styles/background-image`);
        }
        if (seen.has(node.id)) report('E_DUPLICATE_ID', `同批组件 ID 重复：${node.id}`, at);
        seen.add(node.id);
        if (diagnostics.length !== before) valid = false;
      });
      if (!valid) continue;
      for (const [i, node] of body.components.entries()) {
        surface.components.set(node.id, structuredClone(node));
        surface.origins.set(node.id, { index, pointer: `${base}/components/${i}` });
      }
      surface.touched = true;
      inspectSurface(surface, '/components');
    }
  }
  if (!messages.length) report('E_EMPTY', '没有可验证的消息');
  for (const [id, surface] of surfaces) if (!surface.components.has('root')) report('E_ROOT', `Surface ${id} 在流结束时缺少 root`, '/components');
  return { valid: diagnostics.length === 0, diagnostics, surfaces };
}
