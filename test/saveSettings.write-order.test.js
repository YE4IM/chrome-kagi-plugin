/* saveSettings 写序缺陷回归测试：本机与同步存储的写入顺序及失败回退。 */
const test = require('node:test');
const assert = require('node:assert');

const settings = require('../settings.js');

// 桩 chrome.storage：记录调用顺序，支持一次性按 area 注入失败。
function installChromeStub() {
  const calls = [];
  const failOnce = { local: null, sync: null };
  const chrome = { runtime: { lastError: null }, storage: {} };
  for (const area of ['local', 'sync']) {
    chrome.storage[area] = {
      set(value, cb) {
        calls.push({ area, method: 'set', value });
        const injected = failOnce[area];
        failOnce[area] = null;
        queueMicrotask(() => {
          if (injected) {
            chrome.runtime.lastError = { message: injected };
            cb(undefined);
            chrome.runtime.lastError = null;
          } else {
            cb({});
          }
        });
      },
      get(_keys, cb) {
        calls.push({ area, method: 'get' });
        queueMicrotask(() => cb({}));
      },
    };
  }
  globalThis.chrome = chrome;
  return { calls, failOnce };
}

test('开启同步：先写 local 再写 sync，local 含 syncEnabled 标志', async () => {
  const stub = installChromeStub();
  const result = await settings.saveSettings({ homepage: 'https://kagi.com', syncEnabled: true });
  assert.deepStrictEqual(stub.calls.map((c) => `${c.area}.${c.method}`), ['local.set', 'sync.set']);
  assert.deepStrictEqual(stub.calls[0].value, { homepage: 'https://kagi.com/', syncEnabled: true });
  assert.deepStrictEqual(stub.calls[1].value, { homepage: 'https://kagi.com/' });
  assert.deepStrictEqual(result, { homepage: 'https://kagi.com/', syncEnabled: true, needsRepair: false, warning: '' });
});

test('关闭同步：只写 local，完全不触碰 sync', async () => {
  const stub = installChromeStub();
  const result = await settings.saveSettings({ homepage: 'https://example.com', syncEnabled: false });
  assert.deepStrictEqual(stub.calls.map((c) => `${c.area}.${c.method}`), ['local.set']);
  assert.deepStrictEqual(stub.calls[0].value, { homepage: 'https://example.com/', syncEnabled: false });
  assert.deepStrictEqual(result, { homepage: 'https://example.com/', syncEnabled: false, needsRepair: false, warning: '' });
});

test('local 写入失败：sync 不被写入，抛出本机错误（修复前此处会先写 sync 造成两端不一致）', async () => {
  const stub = installChromeStub();
  stub.failOnce.local = 'QUOTA_BYTES 本机配额超限';
  await assert.rejects(
    () => settings.saveSettings({ homepage: 'https://kagi.com', syncEnabled: true }),
    /QUOTA_BYTES 本机配额超限/,
  );
  assert.deepStrictEqual(stub.calls.map((c) => `${c.area}.${c.method}`), ['local.set']);
});

test('sync 写入失败：回退本机 syncEnabled 标志并抛出原始同步错误', async () => {
  const stub = installChromeStub();
  stub.failOnce.sync = 'SYNC 写入被拒绝';
  await assert.rejects(
    () => settings.saveSettings({ homepage: 'https://kagi.com', syncEnabled: true }),
    /SYNC 写入被拒绝/,
  );
  assert.deepStrictEqual(stub.calls.map((c) => `${c.area}.${c.method}`), ['local.set', 'sync.set', 'local.set']);
  assert.deepStrictEqual(stub.calls[0].value, { homepage: 'https://kagi.com/', syncEnabled: true });
  // 回退写入保留新地址，仅关闭同步标志：本机继续用新地址，远端保持旧值，无假"已同步"状态。
  assert.deepStrictEqual(stub.calls[2].value, { homepage: 'https://kagi.com/', syncEnabled: false });
});

test('地址非法：写入前即失败，两个存储都不被触碰', async () => {
  const stub = installChromeStub();
  await assert.rejects(
    () => settings.saveSettings({ homepage: 'javascript:alert(1)', syncEnabled: true }),
    /请输入有效的 HTTP 或 HTTPS 网址/,
  );
  assert.deepStrictEqual(stub.calls, []);
});
