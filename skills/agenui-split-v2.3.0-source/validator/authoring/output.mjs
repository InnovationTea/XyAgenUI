// Development only. The default build writes inside validator/; an export runs it against a private staging directory.
import fs from 'node:fs';
import path from 'node:path';
import { validatorRoot } from '../scripts/lib/catalog.mjs';
export const stage = process.env.AGENUI_PRIVATE_BUILD_STAGE || '';
export function writeArtifact(rel, value) {
  let dst = rel;
  if (!stage) {
    if (rel.startsWith('examples/')) dst = 'fixtures/' + rel.slice('examples/'.length);
    else if (rel === 'styles/index.json') dst = 'generated/visual-index.json';
    else if (!rel.startsWith('generated/')) return; // Model-only docs/templates are emitted exclusively when exporting.
  }
  const p = path.join(stage || validatorRoot, dst);
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p, typeof value === 'string' ? value : JSON.stringify(value,null,2)+'\n');
}
