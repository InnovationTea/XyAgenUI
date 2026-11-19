import { createHash } from 'node:crypto';
import { loadCatalog } from './catalog.mjs';

// All inputs are JSON. Sort object keys recursively; array order stays significant.
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
const sha = v => createHash('sha256').update(canonical(v)).digest('hex');
export function contractStamp(env = loadCatalog()) {
  const {profile, catalog} = env;
  const stamp = {
    formatVersion:1, protocolVersion:profile.protocolVersion, catalogId:profile.catalogId,
    effectiveCatalogSha256:sha(catalog), profileSha256:sha(profile)
  };
  return {...stamp, contractSha256:sha(stamp)};
}
