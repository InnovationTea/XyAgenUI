// Parse the documented interpolation grammar. Never execute generated code.
export function parseTemplate(text) {
  const nodes = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\') { i++; continue; }
    if (text.slice(i, i + 2) !== '${') continue;
    const parser = new Parser(text, i + 2);
    nodes.push(parser.placeholder());
    i = parser.i - 1;
  }
  return nodes;
}

class Parser {
  constructor(text, i = 0) { this.text = text; this.i = i; }
  ws() { while (/\s/.test(this.text[this.i] || '') && this.i < this.text.length) this.i++; }
  fail() { throw new Error(`模板表达式不完整或语法错误，位置 ${this.i + 1}`); }
  take(char) { this.ws(); if (this.text[this.i++] !== char) this.fail(); }
  placeholder() {
    this.ws();
    const rest = this.text.slice(this.i);
    if (/^[A-Za-z_]\w*\s*\(/.test(rest)) {
      const call = this.call(); this.take('}'); return call;
    }
    const end = this.text.indexOf('}', this.i);
    if (end < 0) this.fail();
    const value = this.text.slice(this.i, end).trim();
    if (!value || /[\s${}(),:'"\[\]]/.test(value)) this.fail();
    this.i = end + 1;
    return { path: value };
  }
  call() {
    this.ws(); const match = /^[A-Za-z_]\w*/.exec(this.text.slice(this.i));
    if (!match) this.fail();
    const name = match[0]; this.i += name.length; this.take('(');
    const args = {};
    this.ws();
    if (this.text[this.i] !== ')') while (true) {
      this.ws(); const key = /^[A-Za-z_]\w*/.exec(this.text.slice(this.i));
      if (!key || Object.hasOwn(args, key[0])) this.fail();
      this.i += key[0].length; this.take(':');
      Object.defineProperty(args, key[0], { value: this.value(), enumerable: true });
      this.ws(); if (this.text[this.i] !== ',') break; this.i++;
    }
    this.take(')'); return { call: name, args };
  }
  value() {
    this.ws();
    if (this.text.slice(this.i, this.i + 2) === '${') { this.i += 2; return this.placeholder(); }
    const char = this.text[this.i];
    if (char === '"' || char === "'") {
      this.i++; let result = '';
      while (this.i < this.text.length) {
        const c = this.text[this.i++];
        if (c === char) return result;
        if (c === '\\') {
          const next = this.text[this.i++];
          if (next === undefined) this.fail();
          result += ({ n: '\n', r: '\r', t: '\t' })[next] ?? next;
        } else result += c;
      }
      this.fail();
    }
    if (char === '[') {
      this.i++; const values = []; this.ws();
      if (this.text[this.i] !== ']') while (true) {
        values.push(this.value()); this.ws(); if (this.text[this.i] !== ',') break; this.i++;
      }
      this.take(']'); return values;
    }
    const literal = /^(true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)(?=\s*[,\)\]])/.exec(this.text.slice(this.i));
    if (literal) { this.i += literal[0].length; return JSON.parse(literal[0]); }
    if (/^[A-Za-z_]\w*\s*\(/.test(this.text.slice(this.i))) return this.call();
    this.fail();
  }
}
