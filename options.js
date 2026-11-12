'use strict';

const { DEFAULT_HOMEPAGE, normalizeHomepage, loadSettings, saveSettings } = HomepageSettings;
const form = document.getElementById('settingsForm');
const fields = document.getElementById('settingsFields');
const input = document.getElementById('hp');
const inputWrap = document.getElementById('inputWrap');
const errMsg = document.getElementById('errMsg');
const saveBtn = document.getElementById('save');
const resetBtn = document.getElementById('reset');
const retryBtn = document.getElementById('retry');
const syncInput = document.getElementById('syncEnabled');
const statusEl = document.getElementById('status');
const logoImg = document.getElementById('siteLogo');
const customChip = document.getElementById('customChip');
const presetChips = Array.from(document.querySelectorAll('.chip[data-url]'));

// 文案统一走 chrome.i18n：默认英文，浏览器语言为中文时命中 zh_CN。
const t = (key, subs) => chrome.i18n.getMessage(key, subs) || '';

let savedSettings = null;
let saving = false;
let btnRevertTimer;

function isDirty() {
  if (!savedSettings) return false;
  return savedSettings.needsRepair || (normalizeHomepage(input.value) || input.value.trim()) !== savedSettings.homepage
    || syncInput.checked !== savedSettings.syncEnabled;
}

function showStatus(text, kind = '') {
  statusEl.textContent = text;
  statusEl.className = `status ${kind}`;
}

function showInputError(show) {
  inputWrap.classList.toggle('invalid', show);
  input.setAttribute('aria-invalid', String(show));
  errMsg.hidden = !show;
}

// 预设使用随扩展打包的品牌图标；自定义图标在本机生成，不请求外部服务。
function updateLogo(url) {
  const preset = presetChips.find((chip) => chip.dataset.url === url);
  if (preset) {
    logoImg.src = preset.dataset.icon;
    logoImg.alt = t('logoPresetAlt', [preset.textContent.trim()]);
    return;
  }
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* 无效输入使用占位图标 */ }
  const letter = (host[0] || '?').toUpperCase().replace(/[&<>"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="14" fill="#6366f1"/><text x="32" y="43" font-family="system-ui,sans-serif" font-size="32" font-weight="600" fill="white" text-anchor="middle">${letter}</text></svg>`;
  logoImg.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  logoImg.alt = host ? t('logoHostAlt', [host]) : t('logoCustomAlt');
}

function updateDraft() {
  const url = normalizeHomepage(input.value);
  const matched = presetChips.find((chip) => chip.dataset.url === url);
  [...presetChips, customChip].forEach((chip) => {
    const active = chip === (matched || customChip);
    chip.classList.toggle('active', active);
    chip.setAttribute('aria-pressed', String(active));
  });
  saveBtn.disabled = saving || !isDirty();
  updateLogo(url);
}

function clearSavedFeedback() {
  clearTimeout(btnRevertTimer);
  saveBtn.textContent = t('saveBtn');
  saveBtn.classList.remove('saved');
}

function editDraft() {
  clearSavedFeedback();
  showInputError(false);
  updateDraft();
  showStatus(isDirty() ? t('statusDirty') : t('statusCurrent', [savedSettings.homepage]));
}

function applySettings(settings) {
  savedSettings = settings;
  input.value = settings.homepage;
  syncInput.checked = settings.syncEnabled;
  fields.disabled = false;
  retryBtn.hidden = true;
  showInputError(false);
  clearSavedFeedback();
  updateDraft();
  showStatus(settings.warning || t('statusCurrent', [settings.homepage]), settings.warning ? 'error' : '');
}

async function initialize() {
  fields.disabled = true;
  retryBtn.hidden = true;
  showStatus(t('statusLoading'));
  try {
    applySettings(await loadSettings());
  } catch {
    showStatus(t('statusLoadFail'), 'error');
    retryBtn.hidden = false;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (saving || !savedSettings || !isDirty()) return;
  const homepage = normalizeHomepage(input.value);
  if (!homepage) {
    showInputError(true);
    input.focus();
    return;
  }
  saving = true;
  fields.disabled = true;
  form.setAttribute('aria-busy', 'true');
  clearSavedFeedback();
  saveBtn.textContent = t('saveBtnSaving');
  showStatus(t('statusSaving'));
  try {
    applySettings(await saveSettings({ homepage, syncEnabled: syncInput.checked }));
    showStatus(t('statusSaved', [homepage]), 'success');
    saveBtn.textContent = t('saveBtnSaved');
    saveBtn.classList.add('saved');
    btnRevertTimer = setTimeout(clearSavedFeedback, 2000);
  } catch {
    clearSavedFeedback();
    showStatus(t('statusSaveFail'), 'error');
  } finally {
    saving = false;
    fields.disabled = false;
    form.setAttribute('aria-busy', 'false');
    updateDraft();
  }
});

input.addEventListener('input', editDraft);
syncInput.addEventListener('change', editDraft);
resetBtn.addEventListener('click', () => {
  input.value = DEFAULT_HOMEPAGE;
  editDraft();
});
presetChips.forEach((chip) => chip.addEventListener('click', () => {
  input.value = chip.dataset.url;
  editDraft();
}));
customChip.addEventListener('click', () => {
  input.focus();
  input.select();
});
retryBtn.addEventListener('click', initialize);

chrome.storage.onChanged.addListener((changes, area) => {
  if (saving || !savedSettings) return;
  const relevant = area === 'local' && (changes.homepage || changes.syncEnabled)
    || area === 'sync' && savedSettings.syncEnabled && changes.homepage;
  if (!relevant) return;
  if (isDirty()) {
    showStatus(t('statusRemoteUpdate'));
    return;
  }
  // 异步读取期间若用户开始编辑，不覆盖刚输入的草稿。
  loadSettings().then((settings) => {
    if (!saving && !isDirty()) applySettings(settings);
  }).catch(() => showStatus(t('statusRemoteReadFail'), 'error'));
});

initialize();
