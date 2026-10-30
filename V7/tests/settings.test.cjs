const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_HOMEPAGE, normalizeHomepage, loadSettings, saveSettings } = require('../settings.js');
let local, sync, failures, calls;

beforeEach(() => {
  local = {};
  sync = {};
  failures = new Set();
  calls = [];
  global.chrome = { runtime: {}, storage: {} };
  for (const [name, data] of [['local', local], ['sync', sync]]) {
    chrome.storage[name] = {};
    for (const method of ['get', 'set']) {
      chrome.storage[name][method] = (value, callback) => {
        calls.push(`${name}.${method}`);
        queueMicrotask(() => {
          if (failures.has(`${name}.${method}`)) {
            chrome.runtime.lastError = { message: 'simulated storage failure' };
            callback();
            delete chrome.runtime.lastError;
          } else {
            if (method === 'set') Object.assign(data, value);
            callback(method === 'get' ? { ...data } : undefined);
          }
        });
      };
    }
  }
});

test('normalizes domains, IDN, IPv4, IPv6 and local services', () => {
  for (const [raw, expected] of [
    [' kagi.com ', 'https://kagi.com/'],
    ['http:/example.com', 'http://example.com/'],
    ['https:example.com', 'https://example.com/'],
    ['HTTP://localhost:3000/path?q=1#top', 'http://localhost:3000/path?q=1#top'],
    ['localhost:3000', 'https://localhost:3000/'],
    ['nas:8080/a', 'https://nas:8080/a'],
    ['http://nas/', 'http://nas/'],
    ['http://[::1]:3000/', 'http://[::1]:3000/'],
    ['[2001:db8::1]:8080', 'https://[2001:db8::1]:8080/'],
    ['https://例子.中国/', 'https://xn--fsqu00a.xn--fiqs8s/'],
    ['http://192.168.1.10:8080/', 'http://192.168.1.10:8080/'],
  ]) assert.equal(normalizeHomepage(raw), expected, raw);
});

test('rejects invalid input and non-web schemes', () => {
  for (const raw of [null, {}, 12, '', ' ', 'https://', 'https://a:99999', 'https://exa mple.com',
    'https://exam\nple.com', 'javascript:alert(1)', 'javascript:123', 'data:text/html,x',
    'file:///tmp/a', 'ftp://example.com/', 'chrome://settings', 'blob:https://example.com/x']) {
    assert.equal(normalizeHomepage(raw), null, String(raw));
  }
});

test('keeps existing local settings and leaves sync off by default', async () => {
  local.homepage = 'http://nas:8080/';
  const result = await loadSettings();
  assert.equal(result.homepage, local.homepage);
  assert.equal(result.syncEnabled, false);
  assert.deepEqual(calls, ['local.get']);
});

test('missing or malformed stored values safely fall back and can be repaired', async () => {
  assert.equal((await loadSettings()).homepage, DEFAULT_HOMEPAGE);
  local.homepage = { invalid: true };
  const result = await loadSettings();
  assert.equal(result.homepage, DEFAULT_HOMEPAGE);
  assert.equal(result.needsRepair, true);
  assert.ok(result.warning);
});

test('uses synced homepage only on devices that opted in', async () => {
  local.homepage = 'http://nas/';
  sync.homepage = 'https://www.google.com/';
  assert.equal((await loadSettings()).homepage, 'http://nas/');
  local.syncEnabled = true;
  assert.equal((await loadSettings()).homepage, sync.homepage);
});

test('invalid or unreadable sync data falls back to the local homepage', async () => {
  Object.assign(local, { homepage: 'http://nas/', syncEnabled: true });
  sync.homepage = 'javascript:alert(1)';
  const invalid = await loadSettings();
  assert.equal(invalid.homepage, local.homepage);
  assert.equal(invalid.needsRepair, true);
  failures.add('sync.get');
  const unavailable = await loadSettings();
  assert.equal(unavailable.homepage, local.homepage);
  assert.ok(unavailable.warning);
});

test('local read errors propagate instead of silently overwriting settings', async () => {
  failures.add('local.get');
  await assert.rejects(loadSettings(), /storage failure/);
});

test('saving with sync off only writes local settings', async () => {
  sync.homepage = 'https://remote.example/';
  await saveSettings({ homepage: 'example.com', syncEnabled: false });
  assert.deepEqual(local, { homepage: 'https://example.com/', syncEnabled: false });
  assert.equal(sync.homepage, 'https://remote.example/');
  assert.deepEqual(calls, ['local.set']);
});

test('enabling sync writes the selected homepage then commits local settings', async () => {
  await saveSettings({ homepage: 'example.com', syncEnabled: true });
  assert.equal(sync.homepage, 'https://example.com/');
  assert.equal(local.homepage, sync.homepage);
  assert.equal(local.syncEnabled, true);
  assert.deepEqual(calls, ['sync.set', 'local.set']);
});

test('sync write failures leave local settings unchanged and report failure', async () => {
  local.homepage = 'http://nas/';
  failures.add('sync.set');
  await assert.rejects(saveSettings({ homepage: 'example.com', syncEnabled: true }));
  assert.deepEqual(local, { homepage: 'http://nas/' });
});

test('local write failures report failure; invalid URLs never reach storage', async () => {
  failures.add('local.set');
  await assert.rejects(saveSettings({ homepage: 'example.com', syncEnabled: false }));
  assert.deepEqual(local, {});
  calls.length = 0;
  await assert.rejects(saveSettings({ homepage: 'file:///tmp/a', syncEnabled: false }));
  assert.deepEqual(calls, []);
});
