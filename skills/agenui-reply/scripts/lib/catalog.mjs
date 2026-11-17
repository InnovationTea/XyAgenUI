import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export const skillRoot = fileURLToPath(new URL('../../', import.meta.url));
export const readJson = name => JSON.parse(fs.readFileSync(path.resolve(skillRoot, name), 'utf8').replace(/^\uFEFF/, ''));
export const officialCommit = '5c347a8352c1afff31879bcf5af4101df4f94137';
export const fixedCatalogId = 'https://a2ui.org/specification/v0_9/standard_catalog.json';
const actionNames = new Set(['sendMsgToXiaoyi', 'openUrl']);

export function loadCatalog(profilePath) {
  const profile = readJson(profilePath || 'capabilities/profiles/default.json');
  const catalog = readJson('vendor/agenui_catalog.json');
  if (profile.catalogId !== fixedCatalogId) throw new Error(`catalogId 必须固定为 ${fixedCatalogId}`);
  catalog.catalogId = fixedCatalogId;
  const custom = ['calculateNumber', 'sendMsgToXiaoyi', 'resolveCalls'];
  if (profile.version !== '1.0.0' || profile.protocolVersion !== 'v0.9' ||
      !['components', 'functions', 'actions', 'operators', 'events'].every(k => Array.isArray(profile[k]) && profile[k].every(x => typeof x === 'string') && new Set(profile[k]).size === profile[k].length) ||
      typeof profile.styleCompatibility !== 'boolean') throw new Error('能力配置版本或字段不合法');
  for (const name of profile.components) if (!catalog.components[name]) throw new Error(`未提供组件定义：${name}`);
  for (const name of profile.functions) if (!catalog.functions[name] && !custom.includes(name)) throw new Error(`未提供函数定义：${name}`);
  for (const name of profile.actions) if (!actionNames.has(name) || !profile.functions.includes(name)) throw new Error(`动作未启用或不是动作函数：${name}`);
  if (profile.functions.some(n => actionNames.has(n) && !profile.actions.includes(n))) throw new Error('动作函数必须同时列入 actions');
  if (!profile.operators.length || profile.operators.some(n => !/^[a-zA-Z][a-zA-Z0-9]*$/.test(n))) throw new Error('计算运算符配置不合法');

  // Upstream TextStyles inherits a closed Styles object, which rejects its own typography.
  // Flatten that one inheritance boundary; retain every original property constraint.
  const textStyle = catalog.$defs.common_types_TextStyles;
  catalog.$defs.common_types_TextStyles = {
    type: 'object', properties: {
      ...catalog.$defs.common_types_Styles.properties,
      ...textStyle.allOf[1].properties
    }, additionalProperties: false
  };
  const compatibility = readJson('capabilities/style-compatibility.json');
  for (const [name, schema] of Object.entries(catalog.components)) {
    catalog.components[name] = { $ref: `#/$defs/basic_catalog_${name}` };
    // Some catalog definitions are duplicated under components and $defs. Use one source.
    catalog.$defs[`basic_catalog_${name}`] = schema;
    if (name === 'Text') schema.allOf = schema.allOf.filter(s => s.$ref !== '#/$defs/common_types_ComponentCommon');
    if (profile.styleCompatibility && compatibility.components[name]) {
      const base = structuredClone(catalog.$defs.common_types_ComponentCommon);
      base.properties.styles = { type: 'object', properties: {
        ...catalog.$defs.common_types_Styles.properties, ...compatibility.components[name]
      }, additionalProperties: false };
      schema.allOf = schema.allOf.map(s => s.$ref === '#/$defs/common_types_ComponentCommon' ? base : s);
    }
  }
  for (const name of custom) catalog.functions[name] = readJson(`capabilities/functions/${name}.schema.json`);
  catalog.functions.calculateNumber.properties.args.properties.operator.enum = profile.operators;
  catalog.$defs.anyFunction.oneOf = profile.functions.map(name => ({ $ref: `#/functions/${name}` }));
  catalog.$id = 'urn:agenui-reply:effective-catalog';
  const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: true });
  addFormats(ajv);
  ajv.addSchema(catalog);
  const validators = new Map();
  const compile = (kind, name) => {
    const key = `${kind}/${name}`;
    if (!validators.has(key)) validators.set(key, ajv.compile({ $ref: `${catalog.$id}#/${key}` }));
    return validators.get(key);
  };
  return { profile, catalog, actionNames, component: n => compile('components', n), fn: n => compile('functions', n) };
}

export function propertiesOf(schema, catalog) {
  if (!schema) return {};
  if (schema.$ref?.startsWith('#/')) {
    const target = schema.$ref.slice(2).split('/').reduce((v, k) => v?.[k], catalog);
    return propertiesOf(target, catalog);
  }
  return Object.assign({}, ...(schema.allOf || []).map(s => propertiesOf(s, catalog)), schema.properties || {});
}

export function dynamicType(schema) {
  const ref = schema?.$ref || '';
  if (ref.endsWith('_DynamicStringList')) return 'array';
  if (ref.endsWith('_DynamicString')) return 'string';
  if (ref.endsWith('_DynamicNumber')) return 'number';
  if (ref.endsWith('_DynamicBoolean')) return 'boolean';
  return schema?.allOf?.map(dynamicType).find(Boolean);
}
