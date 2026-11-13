# 主页新标签页 2.2.1

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-blue)](https://developer.chrome.com/docs/extensions/mv3/)

[English](README.md) | 简体中文

一个 Chrome MV3 扩展：把新标签页替换为对你设置主页的立即跳转，默认 [Kagi](https://kagi.com/)。跳转读取保存设置时写入的 `localStorage` 同步镜像，在任何内容绘制之前完成导航；镜像缺失或过期时由 `chrome.storage`（也是选项页设置的持久真相）校验回写自愈。仅申请 `storage` 权限，扩展页面不发任何网络请求。完整版本历史见 [CHANGELOG.md](CHANGELOG.md)。

## 功能

### 新标签页跳转

- **镜像跳转**：新标签页加载 head 阻塞式脚本（`newtab-redirect.js`），解析期同步读取 `localStorage` 镜像并以 `location.replace` 导航，先于首帧绘制——热路径上没有异步存储往返。镜像值会再次校验（http/https 协议、主机名存在），脏数据不会触发跳转。
- **绝不回退默认主页**：镜像缺失、非法或读取失败时，跳转脚本故意不做任何事。按默认值跳走会卸载文档，过期镜像将把用户锁死在旧地址上；改由下述完整异步流程决定并修正。
- **自愈**：`newtab.js` 读取 `chrome.storage`（持久真相）跳转到生效主页，并把生效地址回写镜像——修复首次使用与被清空的镜像。若过期镜像已经跳过一次，第二次导航会把它纠正过来。
- **恢复页**：跳转未生效时——设置读取失败、导航异常、或 3 秒后仍未跳转——按需注入本地化的恢复页，含手动打开主页的链接、打开选项页的链接和重试按钮。若 `settings.js` 本身加载失败，则以默认主页兜底，保证恢复页任何失败路径下都能出现。

### 设置与存储

- **校验**（`settings.js` 中的 `normalizeHomepage`）：输入先去首尾空白、含控制字符即拒绝。接受完整 `http`/`https` 地址和无协议值（如 `kagi.com`、`localhost:3000`，省略协议时按 HTTPS 处理）；`主机:端口` 形式可携带非 web 协议，但 `javascript:`、`data:`、`file:`、`ftp:`、`blob:`、`about:`、`chrome:`、`chrome-extension:` 一律拒绝。保存的值是绝对地址。
- **保存写序**：先写 `chrome.storage.local` 作为持久真相，其次刷新 `localStorage` 镜像，开启同步时最后才写 `chrome.storage.sync`。`sync` 写入失败会回退本机 `syncEnabled` 标志并报错——新主页在本机依然生效，重试保存即可再次开启同步。同步配额、频率或网络故障因此不会丢设置。
- **读取行为**：每次加载并行读取 `local` 与 `sync`；仅在开启同步时采用 `sync` 结果。存储中的非法值会给出键控警告（`warnInvalidSaved`、`warnInvalidSync`）而不是静默换默认值，`sync` 读取失败报告 `warnSyncReadFail`；选项页对这些状态显示修复提示。

### 选项页

- **编辑**：主页地址输入框带内联校验，并有一排使用随扩展打包品牌图标的预设快捷项；自定义快捷项接受任意合法地址。同步开关控制跨设备镜像；重置按钮恢复默认主页。
- **状态处理**：跟踪未保存改动，状态反馈保持准确；页面监听 `chrome.storage.onChanged`，其他视图里的改动实时呈现。设置读取失败显示明确错误状态与重试操作，而不是静默空白页；若 `settings.js` 本身加载失败，表单保持禁用，重试会重新加载整页。
- **图标全本地**：预设图标随扩展打包，自定义图标在本机生成——从不请求外部服务。

### 语言

全部文案走 `chrome.i18n`（`_locales/en`、`_locales/zh_CN`），跟随浏览器语言，其他语言回退英文。静态文案由 `data-i18n` / `data-i18n-attr` 注入（`i18n.js`）；动态文案（状态栏、恢复页）直接调 `chrome.i18n.getMessage`。站点与资源名称保留原文拼写。

### 隐私

- **权限最小化**：仅申请 `storage`。
- **零网络请求**：扩展页面执行 `manifest.json` 中声明的 CSP：`script-src 'self'; connect-src 'none'; …`——不发请求，也完全没有内联脚本（跳转脚本为外链的 head 阻塞式文件，语义等价）。

## 安装（开发者模式加载）

1. 克隆或下载本仓库：
   ```
   git clone https://github.com/YE4IM/chrome-kagi-plugin.git
   ```
2. 打开 Chrome，访问 `chrome://extensions`
3. 右上角开启「开发者模式」
4. 点击「加载已解压的扩展程序」，选择本仓库目录（或从 [Releases](https://github.com/YE4IM/chrome-kagi-plugin/releases) 下载 zip 解压后选择该目录）
5. 新标签页即被接管；通过工具栏扩展图标 → 选项 修改主页地址

升级：用新版本替换目录后在 `chrome://extensions` 重新加载扩展。设置存放在 `chrome.storage`，更新不会触碰，无需重新配置。

## 数据与存储键

| 键 | 存储区 | 含义 |
| --- | --- | --- |
| `homepage` | `chrome.storage.local` | 生效主页的持久真相 |
| `syncEnabled` | `chrome.storage.local` | 跨设备同步是否开启 |
| `homepage` | `chrome.storage.sync` | 尽力而为的跨设备副本；仅在同步开启时读取 |
| `homepage` | `localStorage`（扩展页面） | 跳转用的同步镜像，仅是缓存；保存时写入，跳转时自愈 |

## 文件

| 文件 | 职责 |
| --- | --- |
| `manifest.json` | MV3 清单：新标签页接管、`storage` 权限、页面 CSP |
| `newtab.html` | 新标签页；按跳转优先的顺序加载三个脚本 |
| `newtab-redirect.js` | head 阻塞式镜像跳转，先于首帧绘制执行 |
| `newtab.js` | 异步真相校验、镜像自愈、恢复页 |
| `settings.js` | 共用 `HomepageSettings` 模块：校验、存储、同步、镜像 |
| `options.html` / `options.js` | 设置界面 |
| `i18n.js` | 静态 `data-i18n` 文案注入 |
| `_locales/` | `en` 与 `zh_CN` 文案目录 |
| `test/` | 单元测试（`node --test`） |
| `docs/` | 内部报告与证据截图 |

## 开发与测试

纯原生 HTML/JavaScript，无构建步骤、无第三方依赖。

运行单元测试（4 个文件，33 例）：

```
node --test
```

- `normalizeHomepage.test.js` — 地址校验规则
- `loadSettings.test.js` — 设置读取状态机与警告
- `saveSettings.write-order.test.js` — 保存写序与同步失败回退
- `homepageMirror.test.js` — 镜像读写与 `newtab-redirect.js` 的一致性；并断言发布页面中所有 `<script>` 都带 `src`（MV3 CSP 禁止内联脚本）

## 更新日志

版本历史见 [CHANGELOG.md](CHANGELOG.md)（中英双语）。

## 许可

[MIT](LICENSE)
