/** Strict JSON decoding: preserve duplicate-key diagnostics before ordinary object materialization. */
export function parseJsonStrict(text, { maxDepth = 96, maxBytes = 262144 } = {}) {
  if (typeof text !== 'string') throw new TypeError('JSON 输入必须为字符串');
  const fail = (message, code = 'E_PARSE', offset = 0) => {
    const error = new SyntaxError(message); Object.assign(error, { code, offset }); throw error;
  };
  if (Buffer.byteLength(text, 'utf8') > maxBytes) fail('单条消息超过字节上限', 'E_LIMIT');
  // A small syntax walk checks depth/keys. JSON.parse remains the authoritative value decoder.
  let i = 0;
  const ws = () => { while (i < text.length && /[\x20\t\r\n]/.test(text[i])) i++; };
  const string = () => {
    const start = i++;
    while (i < text.length) {
      if (text[i] === '\\') { i += 2; continue; }
      if (text[i++] === '"') {
        try { return JSON.parse(text.slice(start, i)); } catch { fail('JSON 字符串转义或控制字符不合法', 'E_PARSE', start); }
      }
    }
    fail('JSON 字符串未闭合', 'E_PARSE', start);
  };
  const value = depth => {
    if (depth > maxDepth) fail('JSON 嵌套超过上限', 'E_LIMIT', i);
    ws();
    if (text[i] === '"') { string(); return; }
    if (text[i] === '{') {
      i++; ws(); const keys = new Set();
      if (text[i] === '}') { i++; return; }
      while (i < text.length) {
        ws(); if (text[i] !== '"') fail('对象键必须使用双引号', 'E_PARSE', i);
        const at = i, key = string();
        if (keys.has(key)) fail(`JSON 重复键：${key}`, 'E_DUPLICATE_KEY', at);
        keys.add(key); ws(); if (text[i++] !== ':') fail('对象键之后缺少冒号', 'E_PARSE', i - 1);
        value(depth + 1); ws();
        if (text[i] === '}') { i++; return; }
        if (text[i++] !== ',') fail('对象成员之间缺少逗号或闭合括号', 'E_PARSE', i - 1);
      }
      fail('JSON 对象未闭合', 'E_PARSE', i);
    }
    if (text[i] === '[') {
      i++; ws(); if (text[i] === ']') { i++; return; }
      while (i < text.length) {
        value(depth + 1); ws(); if (text[i] === ']') { i++; return; }
        if (text[i++] !== ',') fail('数组成员之间缺少逗号或闭合括号', 'E_PARSE', i - 1);
      }
      fail('JSON 数组未闭合', 'E_PARSE', i);
    }
    const start = i;
    while (i < text.length && !/[\s,\]}]/.test(text[i])) i++;
    if (i === start) fail('缺少 JSON 值', 'E_PARSE', i);
    const token = text.slice(start, i);
    if (!/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)$/.test(token)) fail('JSON 值不合法', 'E_PARSE', start);
    if (/^-?\d/.test(token) && !Number.isFinite(Number(token))) fail('数值超出有限数范围', 'E_NUMBER_RANGE', start);
  };
  value(0); ws(); if (i !== text.length) fail('JSON 值之后存在额外内容', 'E_PARSE', i);
  try { return JSON.parse(text); } catch (error) { fail(error.message, 'E_PARSE', i); }
}
