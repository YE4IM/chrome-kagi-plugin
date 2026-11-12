# 主页新标签页 (chrome-kagi-plugin)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-blue)](https://developer.chrome.com/docs/extensions/mv3/)

**简体中文** | [English](#english)

一个 Chrome MV3 扩展：把新标签页重定向到你自定义的主页，默认 [Kagi](https://kagi.com/)。A Chrome MV3 extension that redirects the new tab to your custom homepage — English below.

## 功能

- **新标签页重定向**：打开新标签页即刻跳转到设置的主页，默认 `https://kagi.com/`，可改为任意合法地址
- **选项页设置**：修改主页地址（内置 URL 校验），可开关跨设备同步
- **零延迟跳转**：保存设置时把生效主页镜像进扩展页 localStorage，新标签页在 head 内同步读取并发起导航，无需等待异步存储；镜像缺失或过期时由 `chrome.storage` 异步校验回写自愈
- **同步安全**：设置以 `chrome.storage.local` 为持久真相，`sync` 仅尽力同步、失败可回退，不会因同步配额或网络问题丢设置
- **中英双语**：界面文案走 `chrome.i18n`，跟随浏览器语言自动切换 English / 简体中文（`_locales/`，默认回退英文）
- **隐私最小化**：仅申请 `storage` 权限；扩展页面 CSP 为 `connect-src 'none'`，不发任何网络请求

## 安装（开发者模式加载）

1. 克隆或下载本仓库：
   ```
   git clone https://github.com/YE4IM/chrome-kagi-plugin.git
   ```
2. 打开 Chrome，访问 `chrome://extensions`
3. 右上角开启「开发者模式」
4. 点击「加载已解压的扩展程序」，选择本仓库目录（或从 [Releases](https://github.com/YE4IM/chrome-kagi-plugin/releases) 下载 zip 解压后选择该目录）
5. 新标签页即被接管；通过工具栏扩展图标 → 选项 修改主页地址

## 开发与测试

纯原生 HTML/JavaScript，无构建步骤、无第三方依赖。

运行单元测试（33 例，覆盖地址校验、设置读写状态机、镜像跳转与写序）：

```
node --test
```

## 许可

[MIT](LICENSE)

---

<a id="english"></a>

# New Tab Homepage (chrome-kagi-plugin)

**[简体中文](#主页新标签页-chrome-kagi-plugin) | English** · A Chrome MV3 extension that replaces the new tab page with a redirect to your own homepage — [Kagi](https://kagi.com/) by default.

## Features

- **New tab redirect**: opening a new tab immediately navigates to your configured homepage; default `https://kagi.com/`, changeable to any valid URL
- **Options page**: edit the homepage URL (with built-in validation) and toggle cross-device sync
- **Zero-latency redirect**: on save, the effective homepage is mirrored into the extension page's `localStorage`; the new tab reads it synchronously in `<head>` and navigates without waiting for async storage. If the mirror is missing or stale, an async `chrome.storage` check heals it back
- **Sync-safe settings**: `chrome.storage.local` is the persistent source of truth; `sync` is best-effort only and failures fall back locally, so sync quota or network issues never lose your settings
- **Bilingual UI**: all text goes through `chrome.i18n` and follows the browser language — English / 简体中文 (`_locales/`, English is the default fallback)
- **Privacy-minimal**: requests only the `storage` permission; extension pages use a CSP of `connect-src 'none'` — no network requests at all

## Install (developer mode)

1. Clone or download this repository:
   ```
   git clone https://github.com/YE4IM/chrome-kagi-plugin.git
   ```
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select this repository folder (or download a zip from [Releases](https://github.com/YE4IM/chrome-kagi-plugin/releases), unzip, and select the extracted folder)
5. The new tab is now taken over; change the homepage via the toolbar extension icon → Options

## Development & testing

Plain HTML/JavaScript — no build step, no third-party dependencies.

Run the unit tests (33 tests covering URL validation, the settings load/save state machine, mirror redirect and write ordering):

```
node --test
```

## License

[MIT](LICENSE)
