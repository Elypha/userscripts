import { GM, GM_addStyle } from "$";

import styleText from "./style.scss?inline";

const menuClass = "elypha-image-actions-menu";
const toastClass = "elypha-image-actions-toast";
const ignoredSelector = `.${menuClass}, .${toastClass}`;
const gestureEventType = "flowmouse:gesture";
const gestureTarget = "image-actions";
const backgroundImageUrlPattern = /url\(\s*(['"]?)(.*?)\1\s*\)/;

interface PointerPosition {
  x: number;
  y: number;
}

interface ImageTarget {
  url: string;
}

let lastPointerPosition: PointerPosition | undefined;
let activeMenu: HTMLElement | undefined;
let activeToast: HTMLElement | undefined;

// Menu feedback

function removeMenu(): void {
  activeMenu?.remove();
  activeMenu = undefined;
}

function showToast(message: string): void {
  activeToast?.remove();

  const toast = document.createElement("div");
  toast.className = toastClass;
  toast.textContent = message;
  document.body.appendChild(toast);
  activeToast = toast;

  window.setTimeout(() => {
    if (activeToast === toast) {
      toast.remove();
      activeToast = undefined;
    }
  }, 2_400);
}

// Image target detection

function findImageAt(point: PointerPosition): ImageTarget | undefined {
  const elements = document.elementsFromPoint(point.x, point.y);
  return findHtmlImageAt(elements, point) ?? findBackgroundImageAt(elements);
}

function findHtmlImageAt(elements: Element[], point: PointerPosition): ImageTarget | undefined {
  const inspectedImages = new Set<HTMLImageElement>();

  for (const element of elements) {
    for (const image of imageCandidates(element, point)) {
      if (inspectedImages.has(image)) continue;
      inspectedImages.add(image);

      const url = getImageUrl(image);
      if (url) return { url };
    }
  }

  return undefined;
}

function findBackgroundImageAt(elements: Element[]): ImageTarget | undefined {
  for (const element of elements) {
    const url = findBackgroundImageUrl(element);
    if (url) return { url };
  }

  return undefined;
}

function isInsideImage(image: HTMLImageElement, point: PointerPosition): boolean {
  const bounds = image.getBoundingClientRect();
  return point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom;
}

function getImageUrl(image: HTMLImageElement): string | undefined {
  const url = image.currentSrc || image.src;
  return url && url !== "about:blank" ? url : undefined;
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

// Image actions

function openImage(url: string): void {
  void GM.openInTab(url, { active: true, insert: true, setParent: true });
  removeMenu();
}

async function copyImage(url: string, button: HTMLButtonElement): Promise<void> {
  button.disabled = true;
  button.textContent = "Copying image…";

  try {
    const pngBlob = fetchImage(url).then(convertToPng);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
    showToast("Image copied.");
    removeMenu();
  } catch (error) {
    console.error("Unable to copy the image.", error);
    button.disabled = false;
    button.textContent = "Copy image";
    showToast("Couldn't copy image.");
  }
}

async function fetchImage(url: string): Promise<Blob> {
  const response = await GM.xmlHttpRequest({
    method: "GET",
    url,
    responseType: "blob",
    anonymous: true,
  });

  if (response.status < 200 || response.status >= 300 || !(response.response instanceof Blob)) {
    throw new Error(`Image request failed with status ${response.status}.`);
  }

  return response.response;
}

async function convertToPng(imageBlob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(imageBlob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Canvas is unavailable.");
  }

  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!pngBlob) throw new Error("Unable to convert the image to PNG.");

  return pngBlob;
}

// Menu

function makeMenuButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

function showMenu(point: PointerPosition, imageTarget: ImageTarget): void {
  removeMenu();

  const menu = document.createElement("div");
  menu.className = menuClass;
  menu.style.left = `${Math.min(point.x, window.innerWidth - 196)}px`;
  menu.style.top = `${Math.min(point.y, window.innerHeight - 96)}px`;

  const openButton = makeMenuButton("Open in new tab", () => openImage(imageTarget.url));
  const copyButton = makeMenuButton("Copy image", () => void copyImage(imageTarget.url, copyButton));

  menu.append(openButton, copyButton);
  document.body.appendChild(menu);
  activeMenu = menu;
}

// Event handling

function isIgnoredTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(ignoredSelector));
}

function rememberPointer(event: PointerEvent): void {
  if (isIgnoredTarget(event.target)) return;

  lastPointerPosition = { x: event.clientX, y: event.clientY };
}

function isImageActionsGesture(event: Event): boolean {
  const detail = (event as CustomEvent<unknown>).detail;
  return typeof detail === "object" && detail !== null && (detail as { target?: unknown }).target === gestureTarget;
}

function onGesture(event: Event): void {
  if (!isImageActionsGesture(event)) return;

  removeMenu();

  if (!lastPointerPosition) {
    showToast("No pointer position.");
    return;
  }

  const imageTarget = findImageAt(lastPointerPosition);
  if (!imageTarget) {
    showToast("No image under pointer.");
    return;
  }

  showMenu(lastPointerPosition, imageTarget);
}

function main(): void {
  GM_addStyle(styleText);
  document.addEventListener("pointermove", rememberPointer, { capture: true, passive: true });
  document.addEventListener("pointerdown", rememberPointer, { capture: true, passive: true });
  document.addEventListener("click", (event) => {
    if (!isIgnoredTarget(event.target)) removeMenu();
  }, { capture: true });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") removeMenu();
  });
  window.addEventListener(gestureEventType, onGesture);
}

main();
