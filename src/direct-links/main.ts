import { getDirectUrl } from "./rules";

const linkSelectors: Partial<Record<string, string>> = {
  "wiki.biligame.com": 'a[href*="game.bilibili.com/linkfilter/"]',
  "www.pixiv.net": 'a[href*="/jump.php?"]',
  "gamebanana.com": 'a[href*="/linkfilter?"]',
  "www.gamebanana.com": 'a[href*="/linkfilter?"]',
};

function main(): void {
  const linkSelector = linkSelectors[window.location.hostname];
  if (!linkSelector) return;

  cleanLinks(document, linkSelector);
  observeLinks(linkSelector);
}

main();

function cleanLinks(root: ParentNode, linkSelector: string): void {
  if (root instanceof HTMLAnchorElement && root.matches(linkSelector)) {
    cleanLink(root);
  }

  root.querySelectorAll<HTMLAnchorElement>(linkSelector).forEach(cleanLink);
}

function cleanLink(link: HTMLAnchorElement): void {
  try {
    const directUrl = getDirectUrl(window.location.hostname, new URL(link.href));
    if (directUrl) {
      link.href = directUrl.href;
    }
  } catch {
    // ignore malformed links
  }
}

function observeLinks(linkSelector: string): void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "attributes" &&
        mutation.target instanceof HTMLAnchorElement &&
        mutation.target.matches(linkSelector)
      ) {
        cleanLink(mutation.target);
      }

      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          cleanLinks(node, linkSelector);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["href"],
    childList: true,
    subtree: true,
  });
}
