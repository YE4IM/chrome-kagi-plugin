// 仅供浏览器验证；扩展页面不会引用此文件。
(() => {
  const state = {
    local: { homepage: 'https://kagi.com/' },
    sync: {},
    failures: [],
    calls: [],
    listeners: [],
    errors: [],
  };
  globalThis.__mockChrome = state;
  addEventListener('error', (event) => state.errors.push(event.message));
  addEventListener('unhandledrejection', (event) => state.errors.push(String(event.reason)));
  addEventListener('securitypolicyviolation', (event) => state.errors.push(({ type: "CSP", directive: event.violatedDirective, blocked: event.blockedURI, source: event.sourceFile, line: event.lineNumber, sample: event.sample })));
  const runtime = { getURL: (path) => new URL(path, location.href).href };
  const storage = { onChanged: { addListener: (listener) => state.listeners.push(listener) } };
  for (const name of ['local', 'sync']) {
    storage[name] = {};
    for (const method of ['get', 'set']) {
      storage[name][method] = (value, callback) => {
        state.calls.push({ area: name, method, value });
        setTimeout(() => {
          if (state.failures.includes(`${name}.${method}`)) {
            runtime.lastError = { message: 'simulated storage failure' };
            callback();
            delete runtime.lastError;
            return;
          }
          if (method === 'get') callback({ ...state[name] });
          else {
            const changes = {};
            for (const [key, newValue] of Object.entries(value)) {
              if (state[name][key] !== newValue) changes[key] = { oldValue: state[name][key], newValue };
            }
            Object.assign(state[name], value);
            callback();
            if (Object.keys(changes).length) state.listeners.forEach((listener) => listener(changes, name));
          }
        }, 10);
      };
    }
  }
  globalThis.chrome = Object.assign(globalThis.chrome || {}, { runtime, storage });
})();
