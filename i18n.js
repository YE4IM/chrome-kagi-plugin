'use strict';
// 静态文案注入：data-i18n → textContent，data-i18n-attr="attr:key;…" → 任意属性。
// 放在 body 末尾的同步脚本：DOM 已解析完、首帧绘制前执行，无闪变。
// 动态文案（状态栏、恢复页）由 options.js / newtab.js 直接调 chrome.i18n.getMessage，不经过本文件。
(function () {
  const msg = (key) => chrome.i18n.getMessage(key) || '';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = msg(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const idx = pair.indexOf(':');
      if (idx < 1) continue;
      const attr = pair.slice(0, idx).trim();
      const key = pair.slice(idx + 1).trim();
      if (attr && key) el.setAttribute(attr, msg(key));
    }
  });
  document.documentElement.lang = chrome.i18n.getUILanguage();
})();
