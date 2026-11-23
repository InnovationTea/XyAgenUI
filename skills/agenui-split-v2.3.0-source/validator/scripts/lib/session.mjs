import { TextDecoder } from 'node:util';
import { isDeepStrictEqual } from 'node:util';
import { loadCatalog } from './catalog.mjs';
import { validateMessages, componentRefs } from './validator.mjs';
import { parseJsonStrict } from './json.mjs';

const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const error = (code, message, pointer = '') => ({ code, message, pointer });

/** Single-reply append policy, distinct from the general A2UI protocol validator. */
function replyDiagnostics(message, before, after) {
  const diagnostics = [];
  if (message.deleteSurface) return [error('E_REPLY_DELETE', '普通回复生成不删除 Surface；清理由宿主处理')];
  const body = message.updateComponents;
  if (!body) return diagnostics;
  const prior = before.get(body.surfaceId), state = after.get(body.surfaceId);
  const root = state.components.get('root');
  if (!root || root.component !== 'Column' || !Array.isArray(root.children) || !root.children.length) return [error('E_REPLY_ROOT', '首个组件批次起必须有非空静态 Column root')];
  if (body.components.at(-1)?.id !== 'root') diagnostics.push(error('E_REPLY_ORDER', '每批最后一个定义必须为完整 root'));
  const prevRoot = prior?.components.get('root');
  if (prevRoot) {
    if (!isDeepStrictEqual(root.children.slice(0, prevRoot.children.length), prevRoot.children)) diagnostics.push(error('E_REPLY_APPEND', 'root.children 必须保留此前区域的顺序和引用'));
    const { children: _a, ...a } = prevRoot, { children: _b, ...b } = root;
    if (!isDeepStrictEqual(a, b)) diagnostics.push(error('E_REPLY_ROOT_STYLE', '后续 root 必须保留全部非 children 属性'));
  }
  if (new Set(root.children).size !== root.children.length) diagnostics.push(error('E_REPLY_ROOT', 'root.children 不得重复引用同一区域'));
  const available = new Set(prior?.components.keys() || []);
  for (const node of body.components) {
    if (node.id !== 'root' && available.has(node.id)) diagnostics.push(error('E_REPLY_REDEFINE', `不重定义已展示节点 ${node.id}；本模式只追加新区域`));
    for (const ref of componentRefs(node)) if (!available.has(ref)) diagnostics.push(error('E_REPLY_ORDER', `${node.id} 引用的 ${ref} 必须在本批更早或已接受批次中定义`));
    available.add(node.id);
  }
  const visited = new Set();
  const visit = id => { if (visited.has(id)) return; visited.add(id); componentRefs(state.components.get(id)).forEach(visit); };
  visit('root');
  for (const id of state.components.keys()) if (!visited.has(id)) diagnostics.push(error('E_REPLY_ORPHAN', `组件 ${id} 不可从 root 到达`));
  return diagnostics;
}

/** Synchronous candidate validation with cloned state. No network, function execution or UI rendering. */
export class ReplySession {
  #surfaces = new Map(); #count = 0; #closed = false; #surfaceId;
  constructor({ env = loadCatalog(), surface = 'new', surfaceId, state, replyRules = true, maxMessages = 128, maxComponents = 1500 } = {}) {
    if (!['new', 'existing'].includes(surface)) throw new Error('surface 应为 new 或 existing');
    Object.assign(this, { env, surface, state, replyRules, maxMessages, maxComponents });
    this.#surfaceId = surfaceId;
  }
  get acceptedCount() { return this.#count; }
  snapshot() { return structuredClone(this.#surfaces); }
  accept(message) {
    if (this.#closed) return { valid: false, diagnostics: [error('E_CLOSED', '本轮已结束')] };
    const index = this.#count + 1;
    let diagnostics = [];
    if (index > this.maxMessages) diagnostics.push(error('E_LIMIT', '本轮消息数超限'));
    const ops = ['createSurface', 'updateDataModel', 'updateComponents', 'deleteSurface'].filter(k => object(message) && Object.hasOwn(message, k));
    const target = ops.length === 1 ? message[ops[0]]?.surfaceId : undefined;
    if (this.#surfaceId && target && target !== this.#surfaceId) diagnostics.push(error('E_REPLY_SURFACE', '本轮只能写入宿主指定的单个 Surface'));
    if (diagnostics.length) return { valid: false, diagnostics: diagnostics.map(d => ({ ...d, index })) };
    const checked = validateMessages([message], { env: this.env, surface: this.surface, state: this.state, surfaces: this.#surfaces, indexOffset: this.#count, finalize: false });
    diagnostics = checked.diagnostics;
    if (!diagnostics.length && this.replyRules) diagnostics = replyDiagnostics(message, this.#surfaces, checked.surfaces);
    const size = [...checked.surfaces.values()].reduce((n, s) => n + s.components.size, 0);
    if (size > this.maxComponents) diagnostics.push(error('E_LIMIT', '本轮组件数超限'));
    if (diagnostics.length) return { valid: false, diagnostics: diagnostics.map(d => ({ ...d, index: d.index ?? index })) };
    // Commit only a validated candidate. Failure above cannot mutate the accepted snapshot.
    this.#surfaces = checked.surfaces; this.#count++; this.#surfaceId ??= target;
    return { valid: true, diagnostics: [], sequence: this.#count, message: structuredClone(message) };
  }
  finish() {
    if (this.#closed) return { valid: false, diagnostics: [error('E_CLOSED', '本轮已结束')] };
    this.#closed = true;
    const diagnostics = [];
    if (!this.#count) diagnostics.push(error('E_EMPTY', '没有已接受消息'));
    for (const [id, s] of this.#surfaces) if (!s.components.has('root')) diagnostics.push(error('E_ROOT', `Surface ${id} 在流结束时缺少 root`));
    return { valid: diagnostics.length === 0, diagnostics, acceptedCount: this.#count };
  }
  abort() { this.#closed = true; }
}

/** Transport adapter: accepts UTF-8 byte chunks OR decoded string chunks, never a mixture. */
export class NDJSONReplyStream {
  #decoder = new TextDecoder('utf-8', { fatal: true }); #buffer = ''; #mode; #failed = false; #closed = false; #first = true; #line = 0;
  constructor({ session = new ReplySession(), maxMessageBytes = 262144, maxDepth = 96, requireFinalNewline = false, onMessage, onError } = {}) {
    Object.assign(this, { session, maxMessageBytes, maxDepth, requireFinalNewline, onMessage, onError });
  }
  #fail(diagnostics) {
    this.#failed = true;
    const result = { valid: false, diagnostics: diagnostics.map(d => ({ ...d, line: d.line ?? this.#line, index: d.index ?? this.session.acceptedCount + 1 })) };
    try { this.onError?.(structuredClone(result)); } catch (e) { result.diagnostics.push(error('E_DIAGNOSTIC_DELIVERY', e.message)); }
    return result;
  }
  #lineMessage(raw) {
    this.#line++;
    if (raw.endsWith('\r')) raw = raw.slice(0, -1);
    if (!raw.trim()) return { valid: true, skipped: true };
    let message;
    try { message = parseJsonStrict(raw, { maxBytes: this.maxMessageBytes, maxDepth: this.maxDepth }); }
    catch (e) { return this.#fail([error(e.code || 'E_PARSE', e.message)]); }
    if (!object(message)) return this.#fail([error('E_WIRE_SHAPE', '每行必须是一条消息对象；不接受顶层数组')]);
    const result = this.session.accept(message);
    if (!result.valid) return this.#fail(result.diagnostics);
    // The integration callback must synchronously enqueue/send, not return an unobserved Promise.
    try {
      const sent = this.onMessage?.(structuredClone(result.message), result.sequence);
      if (sent && typeof sent.then === 'function') throw new Error('onMessage 必须同步入队；异步投递请使用有序队列并单独处理 ACK');
    } catch (e) { return this.#fail([error('E_DELIVERY', e.message)]); }
    return result;
  }
  #consume(text) {
    if (this.#first && text.length) { this.#first = false; text = text.replace(/^\uFEFF/, ''); }
    this.#buffer += text;
    const results = [];
    let end;
    while (!this.#failed && (end = this.#buffer.indexOf('\n')) !== -1) {
      const raw = this.#buffer.slice(0, end); this.#buffer = this.#buffer.slice(end + 1);
      const result = this.#lineMessage(raw); if (!result.skipped) results.push(result);
    }
    if (!this.#failed && Buffer.byteLength(this.#buffer, 'utf8') > this.maxMessageBytes) results.push(this.#fail([error('E_LIMIT', '未闭合消息缓冲区超限')]));
    return results;
  }
  push(chunk) {
    if (this.#closed || this.#failed) return [{ valid: false, diagnostics: [error('E_HALTED', '流已停止；保留已显示区域并通过控制通道处理')] }];
    const mode = typeof chunk === 'string' ? 'text' : chunk instanceof Uint8Array ? 'bytes' : undefined;
    if (!mode || (this.#mode && mode !== this.#mode)) return [this.#fail([error('E_TRANSPORT', '输入需为单一的 string 或 Uint8Array 通道')])];
    this.#mode = mode;
    try { return this.#consume(mode === 'text' ? chunk : this.#decoder.decode(chunk, { stream: true })); }
    catch (e) { return [this.#fail([error('E_UTF8', e.message)])]; }
  }
  finish() {
    if (this.#closed) return { valid: false, diagnostics: [error('E_CLOSED', '流已结束')] };
    this.#closed = true;
    if (this.#failed) return { valid: false, diagnostics: [error('E_HALTED', '此前坏批次已阻断，不能宣称完整成功')], acceptedCount: this.session.acceptedCount };
    try { if (this.#mode === 'bytes') this.#consume(this.#decoder.decode()); }
    catch (e) { return this.#fail([error('E_UTF8', e.message)]); }
    if (this.#failed) return { valid: false, diagnostics: [error('E_HALTED', '尾部解码后消息被拒绝')] };
    if (this.#buffer.trim()) {
      if (this.requireFinalNewline) return this.#fail([error('E_FINAL_NEWLINE', '本轮最后一条消息缺少换行终止符')]);
      const result = this.#lineMessage(this.#buffer); this.#buffer = '';
      if (!result.valid) return result;
    }
    return this.session.finish();
  }
  abort() { this.#closed = true; this.#buffer = ''; this.session.abort(); }
}
