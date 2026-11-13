# Homepage New Tab 2.2.1

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-blue)](https://developer.chrome.com/docs/extensions/mv3/)

English | [简体中文](README.zh-CN.md)

A Chrome MV3 extension that replaces the new tab page with an immediate redirect to your configured homepage — [Kagi](https://kagi.com/) by default. Navigation starts from a synchronous `localStorage` mirror written at save time, so it happens before anything is drawn; a missing or stale mirror is healed from `chrome.storage`, which is also the persistent source of truth for the settings edited on the options page. Only the `storage` permission is requested and extension pages make no network requests at all. Full history: [CHANGELOG.md](CHANGELOG.md).

## Features

### New tab redirect

- **Mirror redirect**: the new tab page loads a head-blocking script (`newtab-redirect.js`) that synchronously reads the `localStorage` mirror and navigates with `location.replace` before the first paint — no async storage round trip in the hot path. The mirror value is re-validated (http/https scheme, hostname present) so dirty data never redirects.
- **Never falls back to the default**: when the mirror is missing, invalid or unreadable, the redirect script does nothing on purpose. Navigating to the default would unload the document and leave a stale mirror locked in; instead the full async flow below decides and corrects.
- **Self-healing**: `newtab.js` reads `chrome.storage` (the persistent truth) and navigates to the effective homepage, then writes it back to the mirror — repairing first use and cleared mirrors. If the mirror already fired and is stale, the second navigation corrects it.
- **Recovery page**: when the redirect did not take effect — settings load failure, navigation error, or still pending after 3 seconds — a localized recovery page is injected on demand with a manual link to the homepage, a link to the options page and a retry button. If `settings.js` itself fails to load, the default homepage is used as a floor so the recovery page always appears.

### Settings and storage

- **Validation** (`normalizeHomepage` in `settings.js`): input is trimmed and rejected on control characters. Full `http`/`https` URLs and scheme-less values such as `kagi.com` or `localhost:3000` are accepted (HTTPS is assumed when the scheme is omitted); `host:port` values may carry a non-web scheme, but `javascript:`, `data:`, `file:`, `ftp:`, `blob:`, `about:`, `chrome:` and `chrome-extension:` are always rejected. Saved values are absolute URLs.
- **Save ordering**: `chrome.storage.local` is written first as the persistent truth, then the `localStorage` mirror is refreshed, and only then is `chrome.storage.sync` written when sync is enabled. A `sync` write failure rolls the local `syncEnabled` flag back and reports the error — the new homepage stays effective locally, and retrying the save re-enables sync. Sync quota, rate and network failures therefore never lose settings.
- **Load behavior**: `local` and `sync` are read in parallel on every load; the `sync` result is consulted only when sync is enabled. An invalid stored value surfaces a keyed warning (`warnInvalidSaved`, `warnInvalidSync`) instead of silently switching to the default, and a failed `sync` read reports `warnSyncReadFail`; the options page shows a repair hint for these states.

### Options page

- **Editing**: a homepage URL field with inline validation and a quick-pick row of preset chips using bundled brand icons; a custom chip accepts any valid URL. A sync toggle controls cross-device mirroring; reset restores the default homepage.
- **State handling**: unsaved changes are tracked so status feedback stays accurate; the page listens to `chrome.storage.onChanged`, so edits made in another view appear live. A settings load failure shows an explicit error state with a retry action instead of a silent blank page; if `settings.js` itself fails to load, the form stays disabled and retry reloads the page.
- **Icons are local**: preset icons ship with the extension and custom icons are generated locally — no external requests, ever.

### Language

All text goes through `chrome.i18n` (`_locales/en`, `_locales/zh_CN`) and follows the browser language, with English as the fallback. Static texts are injected via `data-i18n` / `data-i18n-attr` (`i18n.js`); dynamic texts (status bar, recovery page) call `chrome.i18n.getMessage` directly. Site and resource names keep their original spelling.

### Privacy

- **Minimal permissions**: only `storage` is requested.
- **No network**: extension pages enforce a CSP of `script-src 'self'; connect-src 'none'; …` declared in `manifest.json` — no requests, and no inline scripts anywhere (the redirect is an external head-blocking file, semantically equivalent).

## Installation

1. Clone or download this repository:
   ```
   git clone https://github.com/YE4IM/chrome-kagi-plugin.git
   ```
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select this repository folder (or download a zip from [Releases](https://github.com/YE4IM/chrome-kagi-plugin/releases), unzip, and select the extracted folder)
5. The new tab is now taken over; change the homepage via the toolbar extension icon → Options

Upgrading: replace the folder with the new version and reload the extension on `chrome://extensions`. Settings live in `chrome.storage`, which updates do not touch, so configuration carries over without re-setup.

## Data and storage keys

| Key | Area | Meaning |
| --- | --- | --- |
| `homepage` | `chrome.storage.local` | Persistent source of truth for the effective homepage |
| `syncEnabled` | `chrome.storage.local` | Whether cross-device sync is on |
| `homepage` | `chrome.storage.sync` | Best-effort cross-device copy; consulted only when sync is on |
| `homepage` | `localStorage` (extension pages) | Synchronous redirect mirror, cache only; written on save, healed on redirect |

## Files

| File | Role |
| --- | --- |
| `manifest.json` | MV3 manifest: new tab override, `storage` permission, page CSP |
| `newtab.html` | New tab page; loads the three scripts in redirect-first order |
| `newtab-redirect.js` | Head-blocking mirror redirect, runs before first paint |
| `newtab.js` | Async truth check, mirror self-heal, recovery page |
| `settings.js` | Shared `HomepageSettings` module: validation, storage, sync, mirror |
| `options.html` / `options.js` | Settings UI |
| `i18n.js` | Static `data-i18n` text injection |
| `_locales/` | `en` and `zh_CN` message catalogs |
| `test/` | Unit tests (`node --test`) |
| `docs/` | Internal reports with evidence screenshots |

## Development and testing

Plain HTML/JavaScript — no build step, no third-party dependencies.

Run the unit tests (33 tests in 4 files):

```
node --test
```

- `normalizeHomepage.test.js` — URL validation rules
- `loadSettings.test.js` — settings load state machine and warnings
- `saveSettings.write-order.test.js` — save write ordering and sync-failure rollback
- `homepageMirror.test.js` — mirror read/write parity with `newtab-redirect.js`; also asserts every `<script>` in the shipped pages has a `src` (MV3 CSP forbids inline scripts)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history (bilingual: English / 简体中文).

## License

[MIT](LICENSE)
