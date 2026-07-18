const ngaAlternativeHosts = new Set(["g.nga.cn", "nga.178.com", "ngabbs.com", "ngacn.cc"]);
const wikipediaVariantPath = /^\/(?:zh|zh-(?:cn|hans|hant|hk|mo|my|sg|tw))\//;

export function getPreferredUrl(url: URL): URL | undefined {
  const preferredUrl = preferBoothUrl(url) ?? preferNgaUrl(url) ?? preferWikipediaUrl(url);
  return preferredUrl?.href === url.href ? undefined : preferredUrl;
}

function preferBoothUrl(url: URL): URL | undefined {
  if (!isBoothHost(url.hostname)) return undefined;

  const itemMatch = /^\/(?:[^/]+\/)?items\/(\d+)\/?$/.exec(url.pathname);
  if (!itemMatch?.[1]) return undefined;

  return new URL(`https://booth.pm/ja/items/${itemMatch[1]}`);
}

function isBoothHost(hostname: string): boolean {
  return hostname === "booth.pm" || hostname.endsWith(".booth.pm");
}

function preferNgaUrl(url: URL): URL | undefined {
  const isAlternativeHost = ngaAlternativeHosts.has(url.hostname);
  const isInsecurePreferredHost = url.hostname === "bbs.nga.cn" && url.protocol === "http:";
  if (!isAlternativeHost && !isInsecurePreferredHost) return undefined;

  const preferredUrl = new URL(url);
  preferredUrl.protocol = "https:";
  preferredUrl.hostname = "bbs.nga.cn";
  preferredUrl.port = "";
  return preferredUrl;
}

function preferWikipediaUrl(url: URL): URL | undefined {
  if (!url.hostname.endsWith(".wikipedia.org")) return undefined;

  const preferredUrl = new URL(url);
  if (preferredUrl.hostname.endsWith(".m.wikipedia.org")) {
    preferredUrl.hostname = preferredUrl.hostname.replace(/\.m\.wikipedia\.org$/, ".wikipedia.org");
  }

  if (preferredUrl.hostname === "zh.wikipedia.org" && wikipediaVariantPath.test(preferredUrl.pathname)) {
    preferredUrl.pathname = preferredUrl.pathname.replace(wikipediaVariantPath, "/zh-cn/");
  }

  return preferredUrl.href === url.href ? undefined : preferredUrl;
}
