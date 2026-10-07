const DEFAULT_HOMEPAGE = 'https://kagi.com/';

const input = document.getElementById('hp');
const inputWrap = document.getElementById('inputWrap');
const schemeHint = document.getElementById('schemeHint');
const errMsg = document.getElementById('errMsg');
const saveBtn = document.getElementById('save');
const resetBtn = document.getElementById('reset');
const statusEl = document.getElementById('status');
const chips = Array.from(document.querySelectorAll('.chip'));

let btnRevertTimer;

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

function setActiveChip(url) {
  chips.forEach((chip) => chip.classList.toggle('active', chip.dataset.url === url));
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
    showInputError(false);
    setActiveChip(url);
    flashSaveButton();
    showStatus(`当前主页：${url}`, true);
  });
}

// 初始化：载入已保存的主页
chrome.storage.local.get(['homepage'], ({ homepage = DEFAULT_HOMEPAGE }) => {
  const { scheme, rest } = splitScheme(homepage);
  schemeHint.textContent = scheme;
  input.value = rest;
  setActiveChip(homepage);
  showStatus(`当前主页：${homepage}`);
});

// 粘贴完整 URL 时自动拆出协议前缀
input.addEventListener('input', () => {
  if (/^https?:\/\//i.test(input.value)) {
    const { scheme, rest } = splitScheme(input.value);
    schemeHint.textContent = scheme;
    input.value = rest;
    input.setSelectionRange(rest.length, rest.length);
  }
  if (!input.value.trim()) schemeHint.textContent = 'https://';
  showInputError(false);
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') save();
});

saveBtn.addEventListener('click', save);

resetBtn.addEventListener('click', () => {
  const { scheme, rest } = splitScheme(DEFAULT_HOMEPAGE);
  schemeHint.textContent = scheme;
  input.value = rest;
  save();
});

chips.forEach((chip) => chip.addEventListener('click', () => {
  const { scheme, rest } = splitScheme(chip.dataset.url);
  schemeHint.textContent = scheme;
  input.value = rest;
  save();
}));
