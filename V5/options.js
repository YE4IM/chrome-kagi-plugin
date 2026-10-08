const DEFAULT_HOMEPAGE = 'https://kagi.com/';

const input = document.getElementById('hp');
const inputWrap = document.getElementById('inputWrap');
const schemeHint = document.getElementById('schemeHint');
const errMsg = document.getElementById('errMsg');
const saveBtn = document.getElementById('save');
const resetBtn = document.getElementById('reset');
const statusEl = document.getElementById('status');
const logoImg = document.getElementById('siteLogo');
const customChip = document.getElementById('customChip');
const presetChips = Array.from(document.querySelectorAll('.chip[data-url]'));

// 手动输入模式：只有点击「其他地址」后才能编辑输入框并保存
let manualMode = false;
let savedHomepage = DEFAULT_HOMEPAGE;

let btnRevertTimer;
let logoPreviewTimer;

// 将输入内容规整为完整 URL；无效时返回 null
function buildURL(raw) {
  let value = raw.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = schemeHint.textContent + value;
  try {
    const url = new URL(value);
    const hostOk = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(url.hostname)
      || url.hostname === 'localhost'
      || /^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname);
    if (!hostOk) return null;
    return url.href;
  } catch {
    return null;
  }
}

// 输入框只保留域名和路径，协议前缀由提示符展示
function splitScheme(value) {
  const match = value.match(/^(https?:\/\/)(.*)$/i);
  if (match) return { scheme: match[1].toLowerCase(), rest: match[2] };
  return { scheme: 'https://', rest: value };
}

function showInputError(show) {
  inputWrap.classList.toggle('invalid', show);
  errMsg.classList.toggle('show', show);
}

function setActiveChip() {
  const matched = presetChips.find((chip) => chip.dataset.url === savedHomepage);
  presetChips.forEach((chip) => chip.classList.toggle('active', !manualMode && chip === matched));
  customChip.classList.toggle('active', manualMode || !matched);
}

function setManualMode(on) {
  manualMode = on;
  input.readOnly = !on;
  saveBtn.disabled = !on;
  if (on) {
    input.focus();
    input.select();
    showStatus('手动输入模式：输入网址后点击「保存设置」');
  }
  setActiveChip();
}

// 域名首字母头像，所有 favicon 源都失败时的最终兜底
function letterAvatar(host) {
  const letter = (host.replace(/^www\./, '')[0] || '?').toUpperCase();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">` +
    `<rect width="64" height="64" rx="14" fill="#6366f1"/>` +
    `<text x="32" y="42" font-family="-apple-system, 'Segoe UI', sans-serif" ` +
    `font-size="30" font-weight="600" fill="#fff" text-anchor="middle">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// 根据主页网址解析网站 favicon，逐级回退：Google s2 → DuckDuckGo → 首字母头像 → kagi.png
function updateLogo(url) {
  let host = null;
  try { host = new URL(url).hostname; } catch { /* URL 无效时走默认图标 */ }
  const candidates = host ? [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
    letterAvatar(host),
  ] : ['kagi.png'];
  let index = 0;
  logoImg.onerror = () => {
    index += 1;
    if (index < candidates.length) logoImg.src = candidates[index];
    else logoImg.onerror = null;
  };
  logoImg.src = candidates[0];
}

function showStatus(text, success) {
  statusEl.textContent = text;
  statusEl.classList.toggle('success', !!success);
}

function flashSaveButton() {
  saveBtn.textContent = '\u2713 已保存';
  saveBtn.classList.add('saved');
  clearTimeout(btnRevertTimer);
  btnRevertTimer = setTimeout(() => {
    saveBtn.textContent = '保存设置';
    saveBtn.classList.remove('saved');
  }, 2000);
}

function save() {
  const url = buildURL(input.value);
  if (!url) {
    showInputError(true);
    inputWrap.classList.remove('shake');
    void inputWrap.offsetWidth; // 重新触发抖动动画
    inputWrap.classList.add('shake');
    return;
  }
  chrome.storage.local.set({ homepage: url }, () => {
    savedHomepage = url;
    showInputError(false);
    setActiveChip();
    updateLogo(url);
    flashSaveButton();
    showStatus(`当前主页：${url}`, true);
  });
}

// 初始化：载入已保存的主页
chrome.storage.local.get(['homepage'], ({ homepage = DEFAULT_HOMEPAGE }) => {
  savedHomepage = homepage;
  const { scheme, rest } = splitScheme(homepage);
  schemeHint.textContent = scheme;
  input.value = rest;
  setActiveChip();
  updateLogo(homepage);
  showStatus(`当前主页：${homepage}`);
});

// 粘贴完整 URL 时自动拆出协议前缀；输入有效网址时实时预览其网站图标
input.addEventListener('input', () => {
  if (/^https?:\/\//i.test(input.value)) {
    const { scheme, rest } = splitScheme(input.value);
    schemeHint.textContent = scheme;
    input.value = rest;
    input.setSelectionRange(rest.length, rest.length);
  }
  if (!input.value.trim()) schemeHint.textContent = 'https://';
  showInputError(false);
  clearTimeout(logoPreviewTimer);
  logoPreviewTimer = setTimeout(() => {
    const url = buildURL(input.value);
    if (url) updateLogo(url);
  }, 350);
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && manualMode) save();
});

// 锁定状态下点击输入框，提示需通过「其他地址」解锁
input.addEventListener('click', () => {
  if (!manualMode) showStatus('点击「其他地址」可手动输入网址');
});

saveBtn.addEventListener('click', save);

resetBtn.addEventListener('click', () => {
  setManualMode(false);
  const { scheme, rest } = splitScheme(DEFAULT_HOMEPAGE);
  schemeHint.textContent = scheme;
  input.value = rest;
  save();
});

presetChips.forEach((chip) => chip.addEventListener('click', () => {
  setManualMode(false);
  const { scheme, rest } = splitScheme(chip.dataset.url);
  schemeHint.textContent = scheme;
  input.value = rest;
  save();
}));

customChip.addEventListener('click', () => setManualMode(true));
