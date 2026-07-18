import { GM, GM_addStyle } from "$";

import { copyImageToClipboard } from "./image-clipboard";
import { findImageUrlAt, type PointerPosition } from "./image-target";
import styleText from "./style.scss?inline";

const menuClass = "elypha-image-actions-menu";
const toastClass = "elypha-image-actions-toast";
const ignoredSelector = `.${menuClass}, .${toastClass}`;
const gestureEventType = "flowmouse:gesture";
const gestureTarget = "image-actions";

class ImageActionsController {
  private lastPointerPosition: PointerPosition | undefined;
  private activeMenu: HTMLElement | undefined;
  private activeToast: HTMLElement | undefined;

  start(): void {
    GM_addStyle(styleText);
    document.addEventListener("pointermove", (event) => this.rememberPointer(event), { capture: true, passive: true });
    document.addEventListener("pointerdown", (event) => this.rememberPointer(event), { capture: true, passive: true });
    document.addEventListener("click", (event) => {
      if (!this.isIgnoredTarget(event.target)) this.removeMenu();
    }, { capture: true });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.removeMenu();
    });
    window.addEventListener(gestureEventType, (event) => this.onGesture(event));
  }

  private rememberPointer(event: PointerEvent): void {
    if (this.isIgnoredTarget(event.target)) return;

    this.lastPointerPosition = { x: event.clientX, y: event.clientY };
  }

  private isIgnoredTarget(target: EventTarget | null): boolean {
    return target instanceof Element && Boolean(target.closest(ignoredSelector));
  }

  private onGesture(event: Event): void {
    if (!this.isImageActionsGesture(event)) return;

    this.removeMenu();

    if (!this.lastPointerPosition) {
      this.showToast("No pointer position.");
      return;
    }

    const imageUrl = findImageUrlAt(this.lastPointerPosition);
    if (!imageUrl) {
      this.showToast("No image under pointer.");
      return;
    }

    this.showMenu(this.lastPointerPosition, imageUrl);
  }

  private isImageActionsGesture(event: Event): boolean {
    const detail = (event as CustomEvent<unknown>).detail;
    return typeof detail === "object" && detail !== null && (detail as { target?: unknown }).target === gestureTarget;
  }

  private showMenu(point: PointerPosition, imageUrl: string): void {
    this.removeMenu();

    const menu = document.createElement("div");
    menu.className = menuClass;
    menu.style.left = `${Math.min(point.x, window.innerWidth - 196)}px`;
    menu.style.top = `${Math.min(point.y, window.innerHeight - 96)}px`;

    const openButton = this.makeMenuButton("Open in new tab", () => this.openImage(imageUrl));
    const copyButton = this.makeMenuButton("Copy image", () => void this.copyImage(imageUrl, copyButton));

    menu.append(openButton, copyButton);
    document.body.appendChild(menu);
    this.activeMenu = menu;
  }

  private makeMenuButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  private removeMenu(): void {
    this.activeMenu?.remove();
    this.activeMenu = undefined;
  }

  private openImage(url: string): void {
    void GM.openInTab(url, { active: true, insert: true, setParent: true });
    this.removeMenu();
  }

  private async copyImage(url: string, button: HTMLButtonElement): Promise<void> {
    button.disabled = true;
    button.textContent = "Copying image…";

    try {
      await copyImageToClipboard(url);
      this.showToast("Image copied.");
      this.removeMenu();
    } catch (error) {
      console.error("Unable to copy the image.", error);
      button.disabled = false;
      button.textContent = "Copy image";
      this.showToast("Couldn't copy image.");
    }
  }

  private showToast(message: string): void {
    this.activeToast?.remove();

    const toast = document.createElement("div");
    toast.className = toastClass;
    toast.textContent = message;
    document.body.appendChild(toast);
    this.activeToast = toast;

    window.setTimeout(() => {
      if (this.activeToast === toast) {
        toast.remove();
        this.activeToast = undefined;
      }
    }, 2_400);
  }
}

new ImageActionsController().start();
