export function getDirectUrl(pageHostname: string, linkUrl: URL): URL | undefined {
  switch (pageHostname) {
    case "wiki.biligame.com":
      return unwrapBiliGame(linkUrl);
    case "www.pixiv.net":
      return unwrapPixiv(linkUrl);
    case "gamebanana.com":
    case "www.gamebanana.com":
      return unwrapGameBanana(linkUrl);
    default:
      return undefined;
  }
}

function unwrapBiliGame(linkUrl: URL): URL | undefined {
  if (linkUrl.hostname !== "game.bilibili.com" || linkUrl.pathname !== "/linkfilter/") {
    return undefined;
  }

  const target = linkUrl.searchParams.get("url");
  return target ? parseHttpUrl(target) : undefined;
}

function unwrapPixiv(linkUrl: URL): URL | undefined {
  if (linkUrl.hostname !== "www.pixiv.net" || linkUrl.pathname !== "/jump.php") {
    return undefined;
  }

  const parameterTarget = linkUrl.searchParams.get("url");
  if (parameterTarget) {
    return parseHttpUrl(parameterTarget);
  }

  try {
    const target = decodeURIComponent(linkUrl.search.slice(1));
    return target ? parseHttpUrl(target) : undefined;
  } catch {
    return undefined;
  }
}

function unwrapGameBanana(linkUrl: URL): URL | undefined {
  const isGameBanana = linkUrl.hostname === "gamebanana.com" || linkUrl.hostname === "www.gamebanana.com";
  if (!isGameBanana || linkUrl.pathname !== "/linkfilter") {
    return undefined;
  }

  const target = linkUrl.searchParams.get("url");
  return target ? parseHttpUrl(target) : undefined;
}

function parseHttpUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}
