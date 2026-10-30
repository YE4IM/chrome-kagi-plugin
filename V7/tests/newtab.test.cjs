const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = ['settings.js', 'newtab.js'].map(file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')).join('\n');

async function openNewtab({ local = {}, sync = {}, readError = false, pending = false, navigationError = false } = {}) {
  const elements = Object.fromEntries(['recovery', 'message', 'target', 'settings', 'retry'].map(id => [id, { hidden: true, addEventListener(type, listener) { this[type] = listener; } }]));
  const navigations = [];
  const timers = new Map();
  const context = {
    URL,
    document: { getElementById: id => elements[id] },
    location: { replace(url) { if (navigationError) throw new Error('navigation blocked'); navigations.push(url); }, reload() {} },
    setTimeout(callback) { const id = timers.size + 1; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    chrome: {
      runtime: { getURL: file => `chrome-extension://test/${file}` },
      storage: {},
    },
  };
  for (const [area, data] of [['local', local], ['sync', sync]]) {
    context.chrome.storage[area] = { get(keys, callback) {
      if (pending) return;
      queueMicrotask(() => {
        if (readError) context.chrome.runtime.lastError = { message: 'read failed' };
        callback(readError ? undefined : data);
        delete context.chrome.runtime.lastError;
      });
    } };
  }
  vm.runInNewContext(source, context);
  await new Promise(resolve => setImmediate(resolve));
  return { elements, navigations, timers };
}

test('redirects to the validated saved local homepage without showing recovery', async () => {
  const result = await openNewtab({ local: { homepage: 'http://[::1]:3000/' } });
  assert.deepEqual(result.navigations, ['http://[::1]:3000/']);
  assert.equal(result.elements.recovery.hidden, true);
  assert.equal(result.elements.settings.href, 'chrome-extension://test/options.html');
});

test('redirects to synced homepage on an opted-in device', async () => {
  const result = await openNewtab({ local: { homepage: 'http://nas/', syncEnabled: true }, sync: { homepage: 'https://example.com/' } });
  assert.deepEqual(result.navigations, ['https://example.com/']);
});

test('invalid data and storage failures redirect to the default homepage', async () => {
  for (const options of [{ local: { homepage: {} } }, { local: { homepage: 'javascript:alert(1)' } }, { readError: true }]) {
    assert.deepEqual((await openNewtab(options)).navigations, ['https://kagi.com/']);
  }
});

test('pending storage or an unfinished navigation exposes recovery links', async () => {
  for (const options of [{ pending: true }, { local: { homepage: 'https://example.com/' } }]) {
    const result = await openNewtab(options);
    [...result.timers.values()].forEach(callback => callback());
    assert.equal(result.elements.recovery.hidden, false);
    assert.match(result.elements.target.href, /^https:\/\//);
    assert.equal(typeof result.elements.retry.click, 'function');
  }
});

test('a synchronous navigation failure shows recovery immediately', async () => {
  const result = await openNewtab({ navigationError: true });
  assert.equal(result.elements.recovery.hidden, false);
  assert.match(result.elements.message.textContent, /自动跳转失败/);
  assert.equal(result.timers.size, 0);
});
