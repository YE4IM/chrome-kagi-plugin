// 获取存储的主页地址并重定向
chrome.storage.local.get(['homepage'], (data) => {
  const targetURL = data.homepage || 'https://kagi.com/';
  window.location.replace(targetURL);
});
