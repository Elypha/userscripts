import type { MonkeyUserScript } from "vite-plugin-monkey";

export interface UserscriptTarget {
  id: string;
  entry: string;
  fileName: string;
  userscript: MonkeyUserScript;
}

const repositoryUrl = "https://github.com/Elypha/userscripts";
const rawDistUrl = "https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist";

function releaseUrls(fileName: string) {
  return {
    downloadURL: `${rawDistUrl}/${fileName}`,
    updateURL: `${rawDistUrl}/${fileName.replace(/\.user\.js$/, ".meta.js")}`,
  };
}

export const targets: UserscriptTarget[] = [
  {
    id: "url-clipboard",
    entry: "src/url-clipboard/main.ts",
    fileName: "URLClipboard.user.js",
    userscript: {
      name: "URL Clipboard",
      namespace: repositoryUrl,
      version: "1.0.0",
      description: "Copy the current URL in encoded or Unicode form after a flowmouse:gesture event.",
      author: "Elypha",
      license: "Apache-2.0",
      homepageURL: repositoryUrl,
      supportURL: `${repositoryUrl}/issues`,
      match: ["http://*/*", "https://*/*"],
      grant: ["GM.setClipboard"],
      "run-at": "document-idle",
      ...releaseUrls("URLClipboard.user.js"),
    },
  },
  {
    id: "image-actions",
    entry: "src/image-actions/main.ts",
    fileName: "ImageActions.user.js",
    userscript: {
      name: "Image Actions",
      namespace: repositoryUrl,
      version: "1.3.1",
      description: "Open or copy the image under the mouse after a flowmouse:gesture event.",
      author: "Elypha",
      license: "Apache-2.0",
      homepageURL: repositoryUrl,
      supportURL: `${repositoryUrl}/issues`,
      match: ["http://*/*", "https://*/*"],
      connect: "*",
      grant: ["GM_addStyle", "GM.openInTab", "GM.xmlHttpRequest"],
      "run-at": "document-idle",
      ...releaseUrls("ImageActions.user.js"),
    },
  },
  {
    id: "bilibili-hide-lottery-results",
    entry: "src/bilibili-hide-lottery-results/main.ts",
    fileName: "bilibili.com-HideLotteryResults.user.js",
    userscript: {
      name: "bilibili.com: Hide Lottery Results",
      namespace: repositoryUrl,
      version: "1.0.0",
      description: "Replace lottery result posts in Bilibili space timelines with a compact placeholder.",
      author: "Elypha",
      license: "Apache-2.0",
      homepageURL: repositoryUrl,
      supportURL: `${repositoryUrl}/issues`,
      icon: "https://www.bilibili.com/favicon.ico",
      match: "https://space.bilibili.com/*",
      grant: "none",
      "run-at": "document-idle",
      ...releaseUrls("bilibili.com-HideLotteryResults.user.js"),
    },
  },
  {
    id: "biligame-wiki-expand-branches",
    entry: "src/biligame-wiki-expand-branches/main.ts",
    fileName: "wiki.biligame.com-ExpandBranches.user.js",
    userscript: {
      name: "wiki.biligame.com: Expand Branches",
      namespace: repositoryUrl,
      version: "1.0.0",
      description: "Expand plot and message branches on the Honkai: Star Rail BWIKI.",
      author: "Elypha",
      license: "Apache-2.0",
      homepageURL: repositoryUrl,
      supportURL: `${repositoryUrl}/issues`,
      match: "https://wiki.biligame.com/sr/*",
      grant: "none",
      "run-at": "document-idle",
      ...releaseUrls("wiki.biligame.com-ExpandBranches.user.js"),
    },
  },
  {
    id: "direct-links",
    entry: "src/direct-links/main.ts",
    fileName: "DirectLinks.user.js",
    userscript: {
      name: "Direct Links",
      namespace: repositoryUrl,
      version: "1.0.0",
      description: "Unwrap redirect links on Biligame, Pixiv, and GameBanana.",
      author: "Elypha",
      license: "Apache-2.0",
      homepageURL: repositoryUrl,
      supportURL: `${repositoryUrl}/issues`,
      match: [
        "https://wiki.biligame.com/*",
        "https://www.pixiv.net/*",
        "https://gamebanana.com/*",
        "https://www.gamebanana.com/*",
      ],
      grant: "none",
      "run-at": "document-idle",
      ...releaseUrls("DirectLinks.user.js"),
    },
  },
  {
    id: "preferred-urls",
    entry: "src/preferred-urls/main.ts",
    fileName: "PreferredURLs.user.js",
    userscript: {
      name: "Preferred URLs",
      namespace: repositoryUrl,
      version: "1.0.0",
      description: "Normalise Booth, NGA, and Wikipedia URLs to preferred forms.",
      author: "Elypha",
      license: "Apache-2.0",
      homepageURL: repositoryUrl,
      supportURL: `${repositoryUrl}/issues`,
      match: [
        "https://booth.pm/*",
        "https://*.booth.pm/*",
        "*://g.nga.cn/*",
        "*://nga.178.com/*",
        "*://ngabbs.com/*",
        "*://ngacn.cc/*",
        "http://bbs.nga.cn/*",
        "https://*.m.wikipedia.org/*",
        "https://zh.wikipedia.org/*",
      ],
      grant: "none",
      "run-at": "document-start",
      ...releaseUrls("PreferredURLs.user.js"),
    },
  },
  {
    id: "booth-grid-image-viewer",
    entry: "src/booth-grid-image-viewer/main.ts",
    fileName: "booth.pm-GridImageViewer.user.js",
    userscript: {
      name: "booth.pm: Grid Image Viewer",
      namespace: repositoryUrl,
      version: "1.4.0",
      description: "View all preview images in an overlay with a main viewer and a thumbnail grid.",
      author: "Elypha",
      license: "Apache-2.0",
      homepageURL: repositoryUrl,
      supportURL: `${repositoryUrl}/issues`,
      match: ["https://booth.pm/*/items/*", "https://*.booth.pm/items/*"],
      grant: ["GM_addStyle"],
      "run-at": "document-idle",
      ...releaseUrls("booth.pm-GridImageViewer.user.js"),
    },
  },
  {
    id: "google-quick-language-filter",
    entry: "src/google-quick-language-filter/main.ts",
    fileName: "google.com-QuickLanguageFilter.user.js",
    userscript: {
      name: "google.com: Quick Language Filter",
      namespace: repositoryUrl,
      version: "1.1.0",
      description: "Add quick language filter buttons to Google search results.",
      author: "Elypha",
      license: "Apache-2.0",
      homepageURL: repositoryUrl,
      supportURL: `${repositoryUrl}/issues`,
      icon: "https://www.google.com/s2/favicons?sz=64&domain=google.com",
      match: "https://www.google.com/search?q=*",
      grant: "none",
      "run-at": "document-idle",
      ...releaseUrls("google.com-QuickLanguageFilter.user.js"),
    },
  },
];

export function findTarget(id: string): UserscriptTarget | undefined {
  return targets.find((target) => target.id === id);
}
