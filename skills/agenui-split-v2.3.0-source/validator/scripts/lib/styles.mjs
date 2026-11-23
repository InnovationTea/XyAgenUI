import { readJson } from './catalog.mjs';
const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export function mergeRecipe(base, patch) {
  const out = structuredClone(base);
  for (const [key, value] of Object.entries(patch || {})) {
    if (value === null) delete out[key];
    else if (obj(value) && obj(out[key])) out[key] = mergeRecipe(out[key], value);
    else out[key] = structuredClone(value);
  }
  return out;
}
export function loadVisualProfile(file) {
  const profile = readJson(file || 'authoring/styles/profile.json');
  if (!['light', 'dark'].includes(profile.theme) || !['compact', 'spacious'].includes(profile.density) ||
      ![profile.lengthScale, profile.fontScale].every(x => typeof x === 'number' && Number.isFinite(x) && x > 0 && x <= 8)) throw new Error('视觉 profile 的主题、密度或比例不合法');
  return profile;
}
export function vp(value, scale = 1) { return `${Number((value * scale).toFixed(4))}vp`; }
/** Length strings without a suffix use vp in this host; numbers retain their field-specific meaning. */
export function canonicalVp(value) {
  const match = typeof value === 'string' && /^(\d+(?:\.\d+)?)(?:vp)?$/.exec(value);
  return match ? vp(Number(match[1])) : value;
}
export function textStyle(role = 'body', profile = loadVisualProfile()) {
  const tokens = readJson('authoring/styles/tokens.json'), item = tokens.typography[role];
  if (!item) throw new Error(`未知文字角色 ${role}`);
  return { variant: item.a2uiVariant, styles: {
    'font-size': vp(item.logicalSize, profile.fontScale), 'font-weight': item.weightProject,
    color: tokens.colors[profile.theme][item.colorRole], 'line-height': ['body', 'hint'].includes(role) ? 1.5 : 1.3,
    'text-align': role === 'button' ? 'center' : 'left'
  } };
}
export function rootStyle(profile = loadVisualProfile()) {
  const t = readJson('authoring/styles/tokens.json'), density = t.density[profile.density];
  return { padding: vp(density.pageInset, profile.lengthScale), gap: vp(density.sectionGap, profile.lengthScale),
    'background-color': t.colors[profile.theme].page, 'border-radius': vp(20, profile.lengthScale) };
}

/** Recipes use vp at scale=1. Optional profile scaling is a design choice, never a device-density conversion. */
export function expandTemplate(name, variant = 'default', profile = loadVisualProfile()) {
  const source = readJson(`authoring/styles/recipes/${name}.json`), tokens = readJson('authoring/styles/tokens.json');
  let patch = variant === 'default' ? {} : source.variants[variant];
  if (name === 'Text' && variant === 'summary') patch = { focus: { styles: { 'line-clamp': 3 } } };
  if (name === 'Column' && variant === 'root') patch = {};
  if (patch === undefined) throw new Error(`未知模板变体 ${name}.${variant}`);
  let focus = mergeRecipe(source.focus, patch.focus);
  let deps = source.dependencies.map(node => mergeRecipe(node, patch.nodes?.[node.id]));
  let initialData = structuredClone(patch.initialData || source.initialData);
  const sourceScale = source.unitProfile || { lengthScale: 1, fontScale: 1 };
  const palette = tokens.colors[profile.theme], light = tokens.colors.light;
  const adaptStyles = (styles, component) => {
    const out = {};
    for (const [key, value] of Object.entries(styles || {})) {
      if (key === 'line-clamp' && (value <= 0 || component === 'RichText')) continue;
      let v = value;
      if (obj(v)) v = adaptStyles(v, component);
      if (typeof v === 'string') {
        const scale = key === 'font-size' ? profile.fontScale / sourceScale.fontScale : profile.lengthScale / sourceScale.lengthScale;
        v = v.replace(/(\d+(?:\.\d+)?)(?:vp|px)\b/g, (_, n) => vp(Number(n), scale));
        if (profile.theme !== 'light' && /^(?:color|.*-color)$/.test(key)) {
          if (value === '#FFFFFF00') v = '#00000000';
          else if (/^rgba\(255,255,255,0\.96\)$/.test(value)) v = 'rgba(32,34,36,0.96)';
          else if (key === 'color' && value === light.onAction) v = palette.onAction;
          else if (key === 'background-color' && value === light.surface) v = palette.surface;
          else {
            const role = Object.keys(light).find(r => light[r] === value && !['onAction', 'surface'].includes(r));
            if (role) v = palette[role];
          }
        }
      }
      out[key] = v;
    }
    return out;
  };
  const adapt = node => {
    const n = structuredClone(node);
    if (n.styles) n.styles = adaptStyles(n.styles, n.component);
    if (n.component === 'Column' && n.styles?.gap === vp(12, profile.lengthScale)) n.styles.gap = vp(tokens.density[profile.density].groupGap, profile.lengthScale);
    return n;
  };
  focus = adapt(focus); deps = deps.map(adapt);
  if (name === 'Card') focus.styles.padding = Array(4).fill(vp(tokens.density[variant === 'spacious' ? 'spacious' : profile.density].cardInset, profile.lengthScale)).join(' ');
  if (name === 'Column' && variant === 'root') { focus.styles = rootStyle(profile); }
  if (name === 'Column' && variant === 'section') focus.styles.gap = vp(tokens.density[profile.density].sectionGap, profile.lengthScale);
  if (name === 'TextField' && variant === 'numberDraft') { focus.label = '预算草稿（文本，不直接参加数值运算）'; initialData.form.name = '120'; }
  if (name === 'TextField' && variant === 'password') { focus.label = '敏感输入示例：不要填写真实凭据'; initialData.form.name = ''; }
  // Current skill explicitly rejects dynamic/res:// Image and Carousel sources.
  // Fixture URLs are never real production assets and must be replaced before rendering.
  const replaceResources = value => {
    if (typeof value === 'string' && value.startsWith('res://')) return `https://assets.example.invalid/${value.slice(6)}`;
    if (Array.isArray(value)) return value.map(replaceResources);
    if (obj(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceResources(v)]));
    return value;
  };
  if (name === 'Image') { focus.url = 'https://assets.example.invalid/template-cover.jpg'; initialData = {}; }
  focus = replaceResources(focus); initialData = replaceResources(initialData);
  const resourceRequired = ['Image', 'Carousel', 'Video', 'AudioPlayer', 'Lottie'].includes(name);
  return { focus, dependencies: deps, initialData, resourceRequired };
}
