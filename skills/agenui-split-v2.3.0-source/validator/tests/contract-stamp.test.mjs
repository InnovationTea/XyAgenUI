import assert from 'node:assert/strict';
import test from 'node:test';
import {contractStamp,loadCatalog} from '../scripts/lib/index.mjs';
import {readJson} from '../scripts/lib/catalog.mjs';

test('发布指纹覆盖实际profile与有效Schema，忽略JSON对象键顺序',()=>{
 const env=loadCatalog(),base=contractStamp(env);
 assert.deepEqual(base,readJson('generated/contract-stamp.json'));
 const swapped={...env,profile:Object.fromEntries(Object.entries(env.profile).reverse())};
 assert.equal(contractStamp(swapped).contractSha256,base.contractSha256);
 assert.notEqual(contractStamp({...env,profile:{...env.profile,components:[...env.profile.components,'Chart']}}).contractSha256,base.contractSha256);
 assert.notEqual(contractStamp({...env,catalog:{...env.catalog,description:'changed'}}).contractSha256,base.contractSha256);
});
