/* homepage localStorage 镜像单测：saveSettings 写入镜像、镜像读写正确性、
 * newtab-redirect.js（head 阻塞式跳转脚本）的目标解析（含脏数据/空存储回退）。 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const settings = require('../settings.js');

// 桩 localStorage：内存 Map，可注入一次性 set 抛错模拟配额/隐私模式失败。
function installLocalStorageStub({ failSet = false } = {}) {
  const store = new Map();
  const stub = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      if (failSet) throw new Error('QuotaExceededError');
      store.set(key, String(value));
    },
    _store: store,
  };
  globalThis.localStorage = stub;
  return stub;
}
delete globalThis.localStorage;

test('saveHomepageMirror 写入并读回同一规范化地址', () => {
  const stub = installLocalStorageStub();
  assert.strictEqual(settings.saveHomepageMirror('https://example.com/'), true);
  assert.strictEqual(stub.getItem('homepage'), 'https://example.com/');
  assert.strictEqual(settings.readHomepageMirror(), 'https://example.com/');
});

test('readHomepageMirror：空存储返回 null；非 http/https 协议拒绝；脏 JSON 无关字符串拒绝', () => {
  installLocalStorageStub();
  assert.strictEqual(settings.readHomepageMirror(), null);
  settings.saveHomepageMirror('javascript:alert(1)');
  assert.strictEqual(settings.readHomepageMirror(), null);
  globalThis.localStorage.setItem('homepage', 'not-a-url');
  assert.strictEqual(settings.readHomepageMirror(), null);
});

test('saveSettings 成功后镜像被写入 local.set 的同一地址', async () => {
  installLocalStorageStub();
  const chrome = { runtime: { lastError: null }, storage: {} };
  for (const area of ['local', 'sync']) {
    chrome.storage[area] = {
      set(_value, cb) { queueMicrotask(() => cb({})); },
      get(_keys, cb) { queueMicrotask(() => cb({})); },
    };
  }
  globalThis.chrome = chrome;
  await settings.saveSettings({ homepage: 'https://example.com', syncEnabled: false });
  assert.strictEqual(globalThis.localStorage.getItem('homepage'), 'https://example.com/');
  delete globalThis.chrome;
});

test('saveSettings 镜像写入失败（配额等）不阻断保存，chrome.storage 仍生效', async () => {
  installLocalStorageStub({ failSet: true });
  const chrome = { runtime: { lastError: null }, storage: {} };
  for (const area of ['local', 'sync']) {
    chrome.storage[area] = {
      set(_value, cb) { queueMicrotask(() => cb({})); },
      get(_keys, cb) { queueMicrotask(() => cb({})); },
    };
  }
  globalThis.chrome = chrome;
  const result = await settings.saveSettings({ homepage: 'https://example.com', syncEnabled: false });
  assert.strictEqual(result.homepage, 'https://example.com/');
  delete globalThis.chrome;
});

// MV3 CSP 禁止内联脚本：跳转逻辑是独立文件 newtab-redirect.js，与 settings.js
// readHomepageMirror 是同一规则的最小副本。提取出来在 vm 里跑，断言其解析结果与
// readHomepageMirror 一致（防两处规则漂移），并断言不得引用 HomepageSettings（执行先于 settings.js）。
function redirectTarget(cached) {
  const script = fs.readFileSync(path.join(__dirname, '..', 'newtab-redirect.js'), 'utf8');
  assert.ok(!script.includes('HomepageSettings'), 'newtab-redirect.js 执行先于 settings.js，不得引用 HomepageSettings');
  const sandbox = { localStorage: { getItem: () => cached }, location: { replace: (url) => { sandbox.replaced = url; } }, URL };
  vm.runInNewContext(script, sandbox);
  return sandbox.replaced;
}

test('跳转脚本：镜像地址生效，与 readHomepageMirror 同规则', () => {
  installLocalStorageStub();
  settings.saveHomepageMirror('https://example.com/');
  assert.strictEqual(redirectTarget('https://example.com/'), 'https://example.com/');
  assert.strictEqual(settings.readHomepageMirror(), redirectTarget('https://example.com/'));
});

test('跳转脚本：无镜像/脏镜像不跳转，交给 newtab.js 完整流程自愈', () => {
  assert.strictEqual(redirectTarget(null), undefined);
  assert.strictEqual(redirectTarget('javascript:alert(1)'), undefined);
  assert.strictEqual(redirectTarget('not-a-url'), undefined);
});

// MV3 CSP（script-src 'self'）会静默拦截内联脚本：曾因 head 内联跳转脚本永不执行引发 P0。
// 断言扩展页面不再出现无 src 的 <script>，防止同类回归。
for (const page of ['newtab.html', 'options.html']) {
  test(`${page} 无内联脚本（MV3 CSP 下内联脚本被静默拦截）`, () => {
    const html = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
    for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
      assert.match(m[1], /\bsrc=/, `${page} 出现无 src 的 <script>：CSP 会静默拦截`);
    }
  });
}
