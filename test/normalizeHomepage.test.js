/* normalizeHomepage 边界单测：scheme 白/黑名单、端口坏值、IPv6、控制字符、IDN→punycode。
 * 断言值均来自对现实现（settings.js）的实际运行结果，锁定的是 location.replace 目标的语义。 */
const test = require('node:test');
const assert = require('node:assert');

const { normalizeHomepage, DEFAULT_HOMEPAGE } = require('../settings.js');

test('合法输入：补全 https、小写化 host、保留路径/查询/锚点、trim 首尾空白', () => {
  assert.strictEqual(normalizeHomepage('kagi.com'), 'https://kagi.com/');
  assert.strictEqual(normalizeHomepage('  https://kagi.com  '), 'https://kagi.com/');
  assert.strictEqual(normalizeHomepage('\nkagi.com\n'), 'https://kagi.com/'); // trim 吃掉首尾换行
  assert.strictEqual(normalizeHomepage('HTTPS://EXAMPLE.COM/Path'), 'https://example.com/Path');
  assert.strictEqual(normalizeHomepage('http://example.com/a?b=1#c'), 'http://example.com/a?b=1#c');
  assert.strictEqual(normalizeHomepage('//kagi.com'), 'https://kagi.com/'); // 无 scheme 输入按 https 补全
  assert.strictEqual(DEFAULT_HOMEPAGE, 'https://kagi.com/'); // loadSettings 回退所依赖的常量
});

test('端口：默认端口被剥掉，显式端口保留；host:port 豁免按主机+端口解释', () => {
  assert.strictEqual(normalizeHomepage('https://kagi.com:443/'), 'https://kagi.com/');
  assert.strictEqual(normalizeHomepage('http://kagi.com:80'), 'http://kagi.com/');
  // 该豁免为 localhost:8080 形态存在：未知 scheme + 数字端口不按 scheme 拒绝，而是当 host:port。
  assert.strictEqual(normalizeHomepage('localhost:8080'), 'https://localhost:8080/');
  assert.strictEqual(normalizeHomepage('kagi.com:8080/x'), 'https://kagi.com:8080/x');
  assert.strictEqual(normalizeHomepage('myapp:8080'), 'https://myapp:8080/');
});

test('IPv6：方括号主机直通、可带端口，越界端口拒绝', () => {
  assert.strictEqual(normalizeHomepage('http://[::1]:8080/'), 'http://[::1]:8080/');
  assert.strictEqual(normalizeHomepage('[::1]'), 'https://[::1]/');
  assert.strictEqual(normalizeHomepage('[::1]:3000'), 'https://[::1]:3000/');
  assert.strictEqual(normalizeHomepage('[2001:db8::1]/x'), 'https://[2001:db8::1]/x');
  assert.strictEqual(normalizeHomepage('http://[::1]:99999/'), null);
});

test('IDN 正确转 punycode', () => {
  assert.strictEqual(normalizeHomepage('百度.com'), 'https://xn--wxtr44c.com/');
  assert.strictEqual(normalizeHomepage('https://日本.jp/'), 'https://xn--wgv71a.jp/');
  assert.strictEqual(normalizeHomepage('münchen.de'), 'https://xn--mnchen-3ya.de/');
});

test('危险/非 web scheme 一律拒绝', () => {
  for (const raw of [
    'javascript:alert(1)',
    'data:text/html,x',
    'file:///etc/passwd',
    'ftp://x.com',
    'blob:x',
    'about:blank',
    'chrome://settings',
    'chrome-extension://abc/x',
    'tel:+123', // 未知 scheme 且无数字端口 → 拒绝
    'mailto:a@b.c',
    'ws://x',
  ]) {
    assert.strictEqual(normalizeHomepage(raw), null, raw);
  }
});

test('黑名单 scheme 即使携带数字端口也被拒绝', () => {
  assert.strictEqual(normalizeHomepage('javascript:8080'), null);
  assert.strictEqual(normalizeHomepage('data:8080'), null);
});

test('坏端口：非数字、越界、空、负数全部拒绝', () => {
  for (const raw of ['kagi.com:abc', 'kagi.com:99999', 'kagi.com:', 'kagi.com:-1']) {
    assert.strictEqual(normalizeHomepage(raw), null, raw);
  }
});

test('内嵌控制字符拒绝；首尾空白被 trim 放行；首部控制字符 trim 不掉仍拒绝', () => {
  assert.strictEqual(normalizeHomepage('https://kagi.com/\u0000'), null);
  assert.strictEqual(normalizeHomepage('kagi.\tcom'), null);
  assert.strictEqual(normalizeHomepage('kagi.com\npath'), null);
  assert.strictEqual(normalizeHomepage('kagi.com\u007f'), null); // DEL 不属于 trim 空白
  assert.strictEqual(normalizeHomepage('\u0001kagi.com'), null);
});

test('空值与非字符串输入返回 null', () => {
  for (const raw of ['', '   ', null, undefined, 42, {}, [], true, false]) {
    assert.strictEqual(normalizeHomepage(raw), null, String(raw));
  }
});

test('残缺 URL 拒绝', () => {
  for (const raw of ['https://', 'https:///', '://x', 'not a url', 'no scheme here']) {
    assert.strictEqual(normalizeHomepage(raw), null, raw);
  }
});
