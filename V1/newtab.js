// 获取存储的主页地址并重定向
chrome.storage.sync.get(['homepage'], (data) => {
  const defaultHomepage = 'https://kagi.com/';
  const targetURL = data.homepage || defaultHomepage;
  window.location.replace(targetURL);
});