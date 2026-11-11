'use strict';
// head 阻塞式脚本：解析期同步读 localStorage 镜像，镜像为合法 http/https 地址时立即跳转（先于任何绘制）。
// 镜像是 settings.js 保存设置时写入的缓存；这里做同规则校验防脏数据。
// 镜像缺失/脏数据时故意不跳转：落到 newtab.js 完整流程（读 chrome.storage 持久真相跳正确地址
// 并回写镜像，自愈）。绝不在本文件回退默认主页——一旦按默认值跳走、文档卸载，异步校验就
// 永远没机会用 chrome.storage 里的真实设置修正，过期镜像会把用户锁死在旧地址上。
// 与 settings.js 的 readHomepageMirror 保持同一校验规则，单测比对两者（见 test/homepageMirror.test.js）。
// 注意：本文件先于 settings.js 执行，不能引用全局设置模块。
(function () {
    try {
        const cached = localStorage.getItem('homepage');
        if (typeof cached !== 'string') return;
        const url = new URL(cached);
        if (['http:', 'https:'].includes(url.protocol) && url.hostname) location.replace(url.href);
    } catch (e) { /* localStorage 异常或脏镜像：不跳转，由 newtab.js 接管 */ }
})();
