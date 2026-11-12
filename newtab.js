'use strict';

// 跳转优先：head 阻塞式 newtab-redirect.js 按 localStorage 镜像（settings.js 保存时写入）跳转；
// 镜像缺失/脏数据时它不跳转，由本脚本走完整流程。
// 本脚本读取 chrome.storage（持久真相）做异步校验：地址不同则二次修正，同时把已生效地址
// 回写镜像（修复镜像缺失/过期）。只在跳转未生效（读取设置失败、跳转异常或被拦截）时按需注入恢复页 DOM。
// settings.js 加载失败时兜底默认主页，保证恢复页任何失败路径下都能立即出现。
const DEFAULT_HOMEPAGE =
  (typeof HomepageSettings !== 'undefined' && HomepageSettings.DEFAULT_HOMEPAGE) ||
  'https://kagi.com/';
let recoveryShown = false;
let recoveryTimer;

// 恢复页文案走 chrome.i18n：只在跳转未生效时才注入 DOM，热路径零开销。
const msg = (key) => chrome.i18n.getMessage(key) || '';

function showRecovery(text) {
  if (recoveryShown) {
    document.getElementById('message').textContent = text;
    return;
  }
  recoveryShown = true;
  clearTimeout(recoveryTimer);
  document.documentElement.lang = chrome.i18n.getUILanguage();
  const main = document.createElement('main');
  main.id = 'recovery';
  main.innerHTML = [
    '<h1>' + msg('recoveryHeading') + '</h1>',
    '<p id="message" role="status">' + msg('recoveryOpening') + '</p>',
    '<a id="target" href="' + DEFAULT_HOMEPAGE + '">' + msg('recoveryManual') + '</a>',
    '<a id="settings" href="' + chrome.runtime.getURL('options.html') + '">' + msg('recoverySettings') + '</a>',
    '<button type="button" id="retry">' + msg('recoveryRetry') + '</button>',
  ].join('');
  document.body.appendChild(main);
  document.getElementById('retry').addEventListener('click', () => location.reload());
  if (text) document.getElementById('message').textContent = text;
}

async function redirect() {
  // 存储或导航未完成时仍可手动打开主页、重试或进入设置。
  recoveryTimer = setTimeout(() => showRecovery(msg('recoverySlow')), 3000);
  let homepage = DEFAULT_HOMEPAGE;
  let loaded = false;
  try {
    homepage = (await HomepageSettings.loadSettings()).homepage;
    loaded = true;
  } catch {
    showRecovery(msg('recoveryLoadFail'));
  }
  const target = document.getElementById('target');
  if (target) target.href = homepage;
  // 已生效地址回写镜像：修复首次使用（从未保存过设置）或镜像被清导致的缺失/过期。
  // 只在 chrome.storage 读取成功时回写：失败路径的默认值写入会把默认主页覆盖进镜像。
  if (loaded && typeof HomepageSettings.saveHomepageMirror === 'function') {
    HomepageSettings.saveHomepageMirror(homepage);
  }
  try {
    location.replace(homepage);
  } catch {
    showRecovery(msg('recoveryRedirectFail'));
  }
}

redirect();
