# Changelog

English | 简体中文 — all notable changes are documented in both languages in each release section.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### English

- **Changed**: Internal working documents moved out of the repository root — the optimization-space report and the on-device test report (with its 8 evidence screenshots) now live in `docs/` and `docs/screenshots/`; paths inside the test report were updated accordingly. Unit test files stay in `test/`.

### 简体中文

- **变更**：内部工作文档移出仓库根目录——优化空间报告与实机测试报告（含 8 张证据截图）移入 `docs/` 与 `docs/screenshots/`，实机测试报告内的引用路径已同步更新。单元测试文件仍保留在 `test/`。

---

## [2.2.1] - 2026-11-12

### English

- **Changed**: The options page now handles settings load failures gracefully — it shows an explicit error state with a retry hint instead of a silent blank page.
- **Changed**: Storage warning messages are now keyed through `chrome.i18n` message IDs (`_locales/`), so warnings are properly localized in English and 简体中文.
- **Removed**: Unused `kagi-128.png` asset; manifest metadata cleaned up and the version bumped to **2.2.1**.
- **Docs**: The README is now split into an English front page (`README.md`) and a separate 简体中文 page (`README.zh-CN.md`), each linking to the other; added this bilingual `CHANGELOG.md`.

### 简体中文

- **变更**：选项页现在能优雅处理设置读取失败——显示明确的错误状态与重试提示，而不是静默空白页。
- **变更**：存储警告文案改为走 `chrome.i18n` 消息键（`_locales/`），警告在 English / 简体中文下均可正确本地化。
- **移除**：无用的 `kagi-128.png` 资源；清理 manifest 元数据，版本号升至 **2.2.1**。
- **文档**：README 拆分为英文首页（`README.md`）与独立的简体中文页（`README.zh-CN.md`），二者互相链接；新增中英双语 `CHANGELOG.md`。

---

## [2.2.0] - 2026-11-12

### English

Initial release of the extension.

- **Added**: New-tab redirect to a custom homepage — default [Kagi](https://kagi.com/), changeable to any valid URL via the options page (with built-in URL validation) and a cross-device sync toggle.
- **Added**: Zero-latency redirect — on save, the effective homepage is mirrored into the extension page's `localStorage`; the new tab reads it synchronously in `<head>` and navigates without waiting for async storage. A missing or stale mirror is healed back by an async `chrome.storage` check. Implemented as a head-blocking `newtab-redirect.js` script, fully compliant with the MV3 CSP (no inline scripts).
- **Added**: Failure recovery — if `settings.js` fails to load on the new tab, a recovery page is shown immediately instead of a broken page.
- **Added**: Sync-safe settings — `chrome.storage.local` is the persistent source of truth; `sync` is best-effort only and failures fall back locally, so sync quota or network issues never lose your settings. Storage reads are issued in parallel on load.
- **Added**: Bilingual UI — all text goes through `chrome.i18n` (`_locales/en`, `_locales/zh_CN`), following the browser language with English as the fallback.
- **Added**: Toolbar icons in 16/32/48 px; unit tests via `node --test` (33 tests covering URL validation, the settings load/save state machine, mirror redirect and save write ordering); MIT `LICENSE` and README.

### 简体中文

扩展首个发布版本。

- **新增**：新标签页重定向到自定义主页——默认 [Kagi](https://kagi.com/)，可在选项页改为任意合法地址（内置 URL 校验），并可开关跨设备同步。
- **新增**：零延迟跳转——保存设置时把生效主页镜像进扩展页 `localStorage`，新标签页在 head 内同步读取并立即导航，无需等待异步存储；镜像缺失或过期时由 `chrome.storage` 异步校验回写自愈。实现为 head 阻塞式 `newtab-redirect.js`，完全符合 MV3 CSP（无内联脚本）。
- **新增**：失败恢复——若新标签页上 `settings.js` 加载失败，立即显示恢复页而不是异常页面。
- **新增**：同步安全的设置——以 `chrome.storage.local` 为持久真相，`sync` 仅尽力同步、失败可回退，不会因同步配额或网络问题丢设置；加载时并行读取存储。
- **新增**：中英双语界面——全部文案走 `chrome.i18n`（`_locales/en`、`_locales/zh_CN`），跟随浏览器语言，其他语言回退英文。
- **新增**：16/32/48 px 工具栏图标；`node --test` 单元测试（33 例，覆盖地址校验、设置读写状态机、镜像跳转与保存写序）；MIT `LICENSE` 与 README。

[2.2.1]: https://github.com/YE4IM/chrome-kagi-plugin/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/YE4IM/chrome-kagi-plugin/releases/tag/v2.2.0
