# Userscripts

Small userscripts for a slightly more convenient life on the web.

## Install

- **[Enable Uta-Net Selection](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/uta-net.com-EnableSelection.user.js)** - Restore text selection, copying, cutting, and the context menu on Uta-Net.
- **[Shufoo Mouse Wheel Zoom](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/asp.shufoo.net-MouseWheelZoom.user.js)** — Zoom Shufoo flyers around the mouse pointer with the wheel.
- **[Hide Lottery Results](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/bilibili.com-HideLotteryResults.user.js)** — Replace Bilibili lottery result posts with a compact placeholder.
- **[Expand BWIKI Branches](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/wiki.biligame.com-ExpandBranches.user.js)** — Show every plot and message branch in a nested reading layout.
- **[Grid Image Viewer](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/booth.pm-GridImageViewer.user.js)** — View booth.pm preview images all at once in an overlay.
- **[GameBanana QOL](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/gamebanana.com-QOL.user.js)** — Compact mod category and detail pages, with card gallery buttons, Tab to toggle the viewer, and original image preloading.
- **[Quick Language Filter](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/google.com-QuickLanguageFilter.user.js)** — Filter Google results by 简体中文, 繁體中文, 日本語, or English.
- **[Direct Links](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/DirectLinks.user.js)** — Unwrap redirect links on Biligame, Pixiv, and GameBanana.
- **[Preferred URLs](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/PreferredURLs.user.js)** — Normalise Booth, NGA, and Wikipedia URLs to preferred forms.
- **[Image Actions](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/ImageActions.user.js)** — On `flowmouse:gesture`, open or copy the image under the mouse.
- **[URL Clipboard](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/URLClipboard.user.js)** — On `flowmouse:gesture`, copy the current URL in encoded or Unicode form.
- **[Free SVG Download](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/flaticon.com-FreeSVGDownload.user.js)** — Download the editable SVG for a free Flaticon icon while logged in.

## Development

Set ScriptCat's development connection to `ws://localhost:8642` and enable automatic reconnection.

```powershell
bun install
bun run dev <target>
bun run build
```

Targets:

- `uta-net-enable-selection`
- `shufoo-mouse-wheel-zoom`
- `bilibili-hide-lottery-results`
- `biligame-wiki-expand-branches`
- `booth-grid-image-viewer`
- `gamebanana-qol`
- `direct-links`
- `google-quick-language-filter`
- `image-actions`
- `preferred-urls`
- `url-clipboard`
- `flaticon-free-svg-download`

Repo structure:

- Source code: `src/`
- Release files: `dist/`
- Userscript metadata definition: `scripts/targets.ts`

## License

[Apache License 2.0](LICENSE)
