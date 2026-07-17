# Userscripts

Small userscripts for a slightly more convenient life on the web.

## Install

- **[Grid Image Viewer](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/booth.pm-GridImageViewer.user.js)** — View booth.pm preview images all at once in an overlay.
- **[Quick Language Filter](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/google.com-QuickLanguageFilter.user.js)** — Filter Google results by 简体中文, 繁體中文, 日本語, or English.
- **[Direct Links](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/DirectLinks.user.js)** — Unwrap redirect links on Biligame, Pixiv, and GameBanana.
- **[Preferred URLs](https://github.com/Elypha/userscripts/raw/refs/heads/master/dist/PreferredURLs.user.js)** — Normalise Booth, NGA, and Wikipedia URLs to preferred forms.

## Development

Set ScriptCat's development connection to `ws://localhost:8642` and enable automatic reconnection.

```powershell
bun install
bun run dev <target>
bun run build
```

Targets:

- `booth-grid-image-viewer`
- `direct-links`
- `google-quick-language-filter`
- `preferred-urls`

Repo structure:

- Source code: `src/`
- Release files: `dist/`
- Userscript metadata definition: `scripts/targets.ts`

## License

[Apache License 2.0](LICENSE)
