const DEFAULT_HOMEPAGE = 'https://kagi.com/';
const input = document.getElementById('hp');
const msg = document.getElementById('msg');

chrome.storage.local.get(['homepage'], (data) => {
  input.value = data.homepage || DEFAULT_HOMEPAGE;
});

document.getElementById('save').addEventListener('click', () => {
  chrome.storage.local.set({ homepage: input.value.trim() || DEFAULT_HOMEPAGE }, () => {
    msg.textContent = '已保存';
    setTimeout(() => (msg.textContent = ''), 1500);
  });
});
