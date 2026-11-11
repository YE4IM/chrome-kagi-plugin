'use strict';

// 跳转优先：head 内联脚本已尝试 location.replace(DEFAULT_HOMEPAGE)。
// 本脚本只在跳转未生效（读取设置失败、跳转异常或被拦截）时按需注入恢复页 DOM。
const DEFAULT_HOMEPAGE = HomepageSettings.DEFAULT_HOMEPAGE;
let recoveryShown = false;
let recoveryTimer;

function showRecovery(text) {
  if (recoveryShown) {
    document.getElementById('message').textContent = text;
    return;
  }
  recoveryShown = true;
  clearTimeout(recoveryTimer);
  const main = document.createElement('main');
  main.id = 'recovery';
  main.innerHTML = [
    '<h1>打开主页</h1>',
    '<p id="message" role="status">正在打开主页…</p>',
    '<a id="target" href="' + DEFAULT_HOMEPAGE + '">手动打开主页</a>',
    '<a id="settings" href="' + chrome.runtime.getURL('options.html') + '">主页设置</a>',
    '<button type="button" id="retry">重试</button>',
  ].join('');
  document.body.appendChild(main);
  document.getElementById('retry').addEventListener('click', () => location.reload());
  if (text) document.getElementById('message').textContent = text;
}

async function redirect() {
  // 存储或导航未完成时仍可手动打开主页、重试或进入设置。
  recoveryTimer = setTimeout(() => showRecovery('跳转尚未完成，可以手动打开主页或检查设置。'), 3000);
  let homepage = DEFAULT_HOMEPAGE;
  try {
    homepage = (await loadSettings()).homepage;
  } catch {
    showRecovery('读取设置失败，正在尝试打开默认主页。');
  }
  const target = document.getElementById('target');
  if (target) target.href = homepage;
  try {
    location.replace(homepage);
  } catch {
    showRecovery('自动跳转失败，请手动打开主页或检查设置。');
  }
}

redirect();
