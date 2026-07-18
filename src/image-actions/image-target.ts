const backgroundImageUrlPattern = /url\(\s*(['"]?)(.*?)\1\s*\)/;

export interface PointerPosition {
  x: number;
  y: number;
}

export function findImageUrlAt(point: PointerPosition): string | undefined {
  const elements = document.elementsFromPoint(point.x, point.y);
  return findHtmlImageUrlAt(elements, point) ?? findBackgroundImageUrlAt(elements);
}

function findHtmlImageUrlAt(elements: Element[], point: PointerPosition): string | undefined {
  const inspectedImages = new Set<HTMLImageElement>();

  for (const element of elements) {
    for (const image of imageCandidates(element, point)) {
      if (inspectedImages.has(image)) continue;
      inspectedImages.add(image);

      const url = getImageUrl(image);
      if (url) return url;
    }
  }

  return undefined;
}

function imageCandidates(element: Element, point: PointerPosition): HTMLImageElement[] {
  const candidates: HTMLImageElement[] = [];

  if (element instanceof HTMLImageElement) {
    candidates.push(element);
  }

  const closestImage = element.closest("img");
  if (closestImage instanceof HTMLImageElement) {
    candidates.push(closestImage);
  }

  candidates.push(...element.querySelectorAll<HTMLImageElement>("img"));
  return candidates.filter((image) => isInsideImage(image, point));
}

function isInsideImage(image: HTMLImageElement, point: PointerPosition): boolean {
  const bounds = image.getBoundingClientRect();
  return point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom;
}

function getImageUrl(image: HTMLImageElement): string | undefined {
  const url = image.currentSrc || image.src;
  return url && url !== "about:blank" ? url : undefined;
}

function findBackgroundImageUrlAt(elements: Element[]): string | undefined {
  for (const element of elements) {
    const url = findBackgroundImageUrl(element);
    if (url) return url;
  }

  return undefined;
}

function findBackgroundImageUrl(element: Element): string | undefined {
  for (let candidate: Element | null = element; candidate && candidate !== document.body; candidate = candidate.parentElement) {
    const url = getBackgroundImageUrl(candidate);
    if (url) return url;
  }

  return undefined;
}

function getBackgroundImageUrl(element: Element): string | undefined {
  const backgroundImage = getComputedStyle(element).backgroundImage;
  const match = backgroundImageUrlPattern.exec(backgroundImage);
  if (!match?.[2]) return undefined;

  try {
    return new URL(match[2], document.baseURI).href;
  } catch {
    return undefined;
  }
}
