'use strict';

const { DEFAULT_HOMEPAGE, loadSettings } = HomepageSettings;
const recovery = document.getElementById('recovery');
const message = document.getElementById('message');
const targetLink = document.getElementById('target');
let recoveryTimer;

function showRecovery(text) {
  message.textContent = text;
  recovery.hidden = false;
}

document.getElementById('settings').href = chrome.runtime.getURL('options.html');
document.getElementById('retry').addEventListener('click', () => location.reload());
targetLink.href = DEFAULT_HOMEPAGE;

async function redirect() {
  // 存储或导航未完成时仍可手动打开主页、重试或进入设置。
  recoveryTimer = setTimeout(() => showRecovery('跳转尚未完成，可以手动打开主页或检查设置。'), 3000);
  let homepage = DEFAULT_HOMEPAGE;
  try {
    homepage = (await loadSettings()).homepage;
  } catch {
    message.textContent = '读取设置失败，正在尝试打开默认主页。';
  }
  targetLink.href = homepage;
  try {
    location.replace(homepage);
  } catch {
    clearTimeout(recoveryTimer);
    showRecovery('自动跳转失败，请手动打开主页或检查设置。');
  }
}

redirect();
