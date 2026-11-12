/* loadSettings 状态机单测：本机回退、同步覆盖/失效修复/失败降级、空存储。
 * 断言值均来自对现实现（settings.js）的实际运行结果；warning 断言为 i18n 键名，
 * 键在 _locales 双语包中的存在性由末尾守卫用例锁定。 */
const test = require('node:test');
const assert = require('node:assert');

const settings = require('../settings.js');

// 桩 chrome.storage：local/sync 的 get 返回值可配置，sync.get 可注入 lastError 失败。
function installChromeStub({ local = {}, sync = {}, failSyncGet = false } = {}) {
  const calls = [];
  const chrome = { runtime: { lastError: null }, storage: {} };
  chrome.storage.local = {
    get(_keys, cb) {
      calls.push('local.get');
      queueMicrotask(() => cb({ ...local }));
    },
    set(value, cb) {
      calls.push('local.set');
      queueMicrotask(() => cb({}));
    },
  };
  chrome.storage.sync = {
    get(_keys, cb) {
      calls.push('sync.get');
      queueMicrotask(() => {
        if (failSyncGet) {
          chrome.runtime.lastError = { message: '同步读取被拒绝' };
          cb(undefined);
          chrome.runtime.lastError = null;
        } else {
          cb({ ...sync });
        }
      });
    },
    set(value, cb) {
      calls.push('sync.set');
      queueMicrotask(() => cb({}));
    },
  };
  globalThis.chrome = chrome;
  return calls;
}

test('未开启同步：用本机地址；sync.get 虽被并行发出但结果被丢弃（sync 有不同有效地址也不采用）', async () => {
  const calls = installChromeStub({
    local: { homepage: 'https://local.example/', syncEnabled: false },
    sync: { homepage: 'https://sync.example/' },
  });
  const s = await settings.loadSettings();
  assert.deepStrictEqual(calls, ['local.get', 'sync.get']); // 并行读取：两次 get 均发出
  assert.strictEqual(s.homepage, 'https://local.example/');
  assert.strictEqual(s.syncEnabled, false);
  assert.strictEqual(s.needsRepair, false);
  assert.strictEqual(s.warning, '');
});

test('开启同步：有效 sync 地址覆盖本机（即使本机地址无效），警告与修复标志清空', async () => {
  installChromeStub({
    local: { homepage: 'https://inva\x00lid/', syncEnabled: true },
    sync: { homepage: 'https://sync.example/' },
  });
  const s = await settings.loadSettings();
  assert.strictEqual(s.homepage, 'https://sync.example/');
  assert.strictEqual(s.needsRepair, false);
  assert.strictEqual(s.warning, '');
});

test('开启同步：sync 地址无效 → 保留本机地址，标记修复并提示', async () => {
  installChromeStub({
    local: { homepage: 'https://local.example/', syncEnabled: true },
    sync: { homepage: 'javascript:alert(1)' },
  });
  const s = await settings.loadSettings();
  assert.strictEqual(s.homepage, 'https://local.example/');
  assert.strictEqual(s.needsRepair, true);
  assert.strictEqual(s.warning, 'warnInvalidSync');
});

test('开启同步但 sync 未设置地址：保持本机状态，不误报修复', async () => {
  installChromeStub({
    local: { homepage: 'https://local.example/', syncEnabled: true },
    sync: {},
  });
  const s = await settings.loadSettings();
  assert.strictEqual(s.homepage, 'https://local.example/');
  assert.strictEqual(s.needsRepair, false);
  assert.strictEqual(s.warning, '');
});

test('sync 读取失败（lastError）：降级用本机地址并提示', async () => {
  installChromeStub({ local: { homepage: 'https://local.example/', syncEnabled: true }, failSyncGet: true });
  const s = await settings.loadSettings();
  assert.strictEqual(s.homepage, 'https://local.example/');
  assert.strictEqual(s.needsRepair, false);
  assert.strictEqual(s.warning, 'warnSyncReadFail');
});

test('本机地址无效且未开同步：回退默认主页并请求修复', async () => {
  installChromeStub({ local: { homepage: 'not a url', syncEnabled: false } });
  const s = await settings.loadSettings();
  assert.strictEqual(s.homepage, settings.DEFAULT_HOMEPAGE);
  assert.strictEqual(s.homepage, 'https://kagi.com/');
  assert.strictEqual(s.needsRepair, true);
  assert.strictEqual(s.warning, 'warnInvalidSaved');
});

test('本机无效 + 同步开启 + sync 读取失败：保留本机修复标志，警告为读取失败文案', async () => {
  installChromeStub({ local: { homepage: 'not a url', syncEnabled: true }, failSyncGet: true });
  const s = await settings.loadSettings();
  assert.strictEqual(s.homepage, settings.DEFAULT_HOMEPAGE);
  assert.strictEqual(s.needsRepair, true);
  assert.strictEqual(s.warning, 'warnSyncReadFail');
});

test('空存储：默认主页、同步关闭、无警告无修复', async () => {
  installChromeStub({});
  const s = await settings.loadSettings();
  assert.deepStrictEqual(s, {
    homepage: 'https://kagi.com/',
    syncEnabled: false,
    needsRepair: false,
    warning: '',
  });
});

test('syncEnabled 非严格 true（如 1）一律视为关闭', async () => {
  installChromeStub({ local: { homepage: 'https://local.example/', syncEnabled: 1 } });
  const s = await settings.loadSettings();
  assert.strictEqual(s.syncEnabled, false);
});

test('warning 键名在 _locales en/zh 双语包中都存在且非空（防键名漂移静默显示空串）', () => {
  for (const locale of ['en', 'zh_CN']) {
    const messages = require(`../_locales/${locale}/messages.json`);
    for (const key of ['warnInvalidSaved', 'warnInvalidSync', 'warnSyncReadFail']) {
      assert.ok(messages[key] && messages[key].message, `${locale} 缺少 ${key}`);
    }
  }
});
