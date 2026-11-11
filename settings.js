/* 设置页和新标签页共用的网址校验、存储及同步逻辑。 */
(function (root) {
  'use strict';

  const DEFAULT_HOMEPAGE = 'https://kagi.com/';

  // 内联跳转镜像：newtab.html 的 head 内联脚本没有异步存储往返可用（导航会先于 await 完成），
  // 只能同步读取。保存成功后把已生效的主页镜像进扩展页 localStorage（同源、同步 API）供其零延迟读取。
  // localStorage 受配额/隐私模式限制可能抛异常：镜像只是缓存，失败不影响 chrome.storage 真相。
  const HOMEPAGE_MIRROR_KEY = 'homepage';

  function saveHomepageMirror(homepage) {
    try {
      localStorage.setItem(HOMEPAGE_MIRROR_KEY, homepage);
      return true;
    } catch {
      return false;
    }
  }

  // 读取侧校验与 normalizeHomepage 同规则（镜像只应由 saveSettings 写入合法值）。
  // newtab.html 内联脚本自带此逻辑的最小副本：defer 脚本晚于内联脚本执行，无法复用本函数。
  function readHomepageMirror() {
    try {
      const cached = localStorage.getItem(HOMEPAGE_MIRROR_KEY);
      if (typeof cached !== 'string') return null;
      const url = new URL(cached);
      return ['http:', 'https:'].includes(url.protocol) && url.hostname ? url.href : null;
    } catch {
      return null;
    }
  }

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
    // 并行读取 local+sync；未启用同步时丢弃 sync 结果，省一次串行往返。
    const [local, synced] = await Promise.all([
      storageCall('local', 'get', ['homepage', 'syncEnabled']),
      storageCall('sync', 'get', ['homepage']).catch(() => null),
    ]);
    const cachedHomepage = normalizeHomepage(local.homepage);
    const settings = {
      homepage: cachedHomepage || DEFAULT_HOMEPAGE,
      syncEnabled: local.syncEnabled === true,
      needsRepair: local.homepage !== undefined && !cachedHomepage,
      warning: local.homepage !== undefined && !cachedHomepage ? '已保存的地址无效，暂时使用默认主页。请重新保存设置。' : '',
    };
    if (settings.syncEnabled) {
      if (synced) {
        const homepage = normalizeHomepage(synced.homepage);
        if (homepage) {
          settings.homepage = homepage;
          settings.warning = '';
          settings.needsRepair = false;
        } else if (synced.homepage !== undefined) {
          settings.needsRepair = true;
          settings.warning = '同步的地址无效，暂时使用本机主页。请重新保存设置。';
        }
      } else {
        settings.warning = '暂时无法读取同步设置，已使用本机主页。';
      }
    }
    return settings;
  }

  async function saveSettings({ homepage, syncEnabled }) {
    const normalized = normalizeHomepage(homepage);
    if (!normalized) throw new Error('请输入有效的 HTTP 或 HTTPS 网址');
    const enableSync = syncEnabled === true;
    const localValue = { homepage: normalized, syncEnabled: enableSync };
    // 先写本机（含 syncEnabled 标志）：local 失败时 sync 尚未写入，两端保持一致旧值。
    await storageCall('local', 'set', localValue);
    // local 已生效，同步刷新内联跳转镜像；镜像失败不阻断保存（newtab.js 异步修正仍兜底）。
    saveHomepageMirror(normalized);
    if (enableSync) {
      try {
        await storageCall('sync', 'set', { homepage: normalized });
      } catch (error) {
        // sync 写入失败：回退本机 syncEnabled 标志，避免留下"远端旧值却标记已同步"的假状态；
        // 新地址已在本机生效，重试保存即可再次开启同步。回退本身失败时以原始错误为准。
        try {
          await storageCall('local', 'set', { homepage: normalized, syncEnabled: false });
        } catch {
          /* 回退尽力而为 */
        }
        throw error;
      }
    }
    return { homepage: normalized, syncEnabled: enableSync, needsRepair: false, warning: '' };
  }

  const api = { DEFAULT_HOMEPAGE, normalizeHomepage, loadSettings, saveSettings, saveHomepageMirror, readHomepageMirror };
  root.HomepageSettings = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
