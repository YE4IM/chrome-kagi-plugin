/* 设置页和新标签页共用的网址校验、存储及同步逻辑。 */
(function (root) {
  'use strict';

  const DEFAULT_HOMEPAGE = 'https://kagi.com/';

  function normalizeHomepage(raw) {
    if (typeof raw !== 'string') return null;
    const value = raw.trim();
    if (!value || /[\u0000-\u001f\u007f]/.test(value)) return null;
    const scheme = value.match(/^([a-z][a-z\d+.-]*):/i);
    const hostWithPort = /^[^\s/?#:]+:\d+(?:[/?#]|$)/.test(value);
    if (scheme && !/^https?$/i.test(scheme[1])) {
      if (!hostWithPort || /^(javascript|data|file|ftp|blob|about|chrome|chrome-extension)$/i.test(scheme[1])) return null;
    }
    try {
      const hasWebScheme = scheme && /^https?$/i.test(scheme[1]);
      const url = new URL(hasWebScheme ? value : `https://${value}`);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return null;
      return url.href;
    } catch {
      return null;
    }
  }

  // 包装回调 API，以便在回调作用域内读取 runtime.lastError。
  function storageCall(area, method, value) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage[area][method](value, (result) => {
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message || '存储操作失败'));
          else resolve(result);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async function loadSettings() {
    const local = await storageCall('local', 'get', ['homepage', 'syncEnabled']);
    const cachedHomepage = normalizeHomepage(local.homepage);
    const settings = {
      homepage: cachedHomepage || DEFAULT_HOMEPAGE,
      syncEnabled: local.syncEnabled === true,
      needsRepair: local.homepage !== undefined && !cachedHomepage,
      warning: local.homepage !== undefined && !cachedHomepage ? '已保存的地址无效，暂时使用默认主页。请重新保存设置。' : '',
    };
    if (settings.syncEnabled) {
      try {
        const synced = await storageCall('sync', 'get', ['homepage']);
        const homepage = normalizeHomepage(synced.homepage);
        if (homepage) {
          settings.homepage = homepage;
          settings.warning = '';
          settings.needsRepair = false;
        } else if (synced.homepage !== undefined) {
          settings.needsRepair = true;
          settings.warning = '同步的地址无效，暂时使用本机主页。请重新保存设置。';
        }
      } catch {
        settings.warning = '暂时无法读取同步设置，已使用本机主页。';
      }
    }
    return settings;
  }

  async function saveSettings({ homepage, syncEnabled }) {
    const normalized = normalizeHomepage(homepage);
    if (!normalized) throw new Error('请输入有效的 HTTP 或 HTTPS 网址');
    // 同步成功后才提交本机设置；关闭同步只影响本机。
    if (syncEnabled) await storageCall('sync', 'set', { homepage: normalized });
    await storageCall('local', 'set', { homepage: normalized, syncEnabled: syncEnabled === true });
    return { homepage: normalized, syncEnabled: syncEnabled === true, needsRepair: false, warning: '' };
  }

  const api = { DEFAULT_HOMEPAGE, normalizeHomepage, loadSettings, saveSettings };
  root.HomepageSettings = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
