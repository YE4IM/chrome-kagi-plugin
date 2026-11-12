# New Tab Homepage (chrome-kagi-plugin)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-blue)](https://developer.chrome.com/docs/extensions/mv3/)

English | [简体中文](README.zh-CN.md)

A Chrome MV3 extension that replaces the new tab page with a redirect to your own homepage — [Kagi](https://kagi.com/) by default.

## Features

- **New tab redirect**: opening a new tab immediately navigates to your configured homepage; default `https://kagi.com/`, changeable to any valid URL
- **Options page**: edit the homepage URL (with built-in validation) and toggle cross-device sync; if settings fail to load, the page shows an explicit error state instead of a silent blank page
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

Run the unit tests (33 tests covering URL validation, the settings load/save state machine, mirror redirect and save write ordering):

```
node --test
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history (bilingual: English / 简体中文).

## License

[MIT](LICENSE)
