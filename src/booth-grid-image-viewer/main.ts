import { GM_addStyle } from "$";

import styleText from "./style.scss?inline";

const overlayClass = "elypha-booth-image-viewer-overlay";
const mainViewClass = "elypha-booth-image-viewer-main-view";
const gridClass = "elypha-booth-image-viewer-grid";
const closeButtonClass = "elypha-booth-image-viewer-close-button";
const openButtonClass = "elypha-booth-image-viewer-open-button";
const selectedClass = "elypha-booth-image-viewer-selected";

function main(): void {
  GM_addStyle(styleText);

  const viewButton = document.createElement("button");
  viewButton.type = "button";
  viewButton.textContent = "View Images";
  viewButton.className = openButtonClass;
  viewButton.addEventListener("click", openImageViewer);
  document.body.appendChild(viewButton);

  registerKeyboardNavigation();
}

main();

function openImageViewer(): void {
  if (document.querySelector(`.${overlayClass}`)) return;

  const imageUrls = getImageUrls();
  if (imageUrls.length === 0) {
    window.alert("No images found.");
    return;
  }

  const firstImageUrl = imageUrls[0];
  if (!firstImageUrl) return;

  const overlay = document.createElement("div");
  overlay.className = overlayClass;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeImageViewer(overlay);
    }
  });

  const mainView = document.createElement("div");
  mainView.className = mainViewClass;

  const mainImage = document.createElement("img");
  mainImage.src = firstImageUrl;
  mainView.appendChild(mainImage);

  const grid = document.createElement("div");
  grid.className = gridClass;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = closeButtonClass;
  closeButton.textContent = "×";
  closeButton.title = "Close image viewer";
  closeButton.addEventListener("click", () => closeImageViewer(overlay));

  overlay.append(closeButton, mainView, grid);

  imageUrls.forEach((url, index) => {
    const thumbnail = document.createElement("img");
    thumbnail.src = url;
    thumbnail.dataset.index = String(index);
    if (index === 0) {
      thumbnail.classList.add(selectedClass);
    }

    thumbnail.addEventListener("click", () => {
      mainImage.src = url;
      grid.querySelector(`.${selectedClass}`)?.classList.remove(selectedClass);
      thumbnail.classList.add(selectedClass);
    });

    grid.appendChild(thumbnail);
  });

  document.body.appendChild(overlay);
}

function getImageUrls(): string[] {
  const slides = document.querySelectorAll<HTMLElement>("div.primary-image-area div.slick-track div.slick-slide[data-slick-index]");

  return Array.from(slides)
    .filter((slide) => !slide.classList.contains("slick-cloned"))
    .map((slide) => {
      const image = slide.querySelector<HTMLImageElement>("img");
      return image?.dataset.lazy || image?.src;
    })
    .filter((url): url is string => Boolean(url));
}

function closeImageViewer(overlay: HTMLElement): void {
  overlay.remove();
}

function registerKeyboardNavigation(): void {
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const overlay = document.querySelector<HTMLElement>(`.${overlayClass}`);

    if (key === "tab") {
      event.preventDefault();
      if (overlay instanceof HTMLElement) {
        closeImageViewer(overlay);
      } else {
        openImageViewer();
      }
      return;
    }

    if (!overlay) return;

    if (key === "escape") {
      event.preventDefault();
      closeImageViewer(overlay);
    } else if (key === "arrowleft" || key === "a") {
      event.preventDefault();
      navigateImages(overlay, -1);
    } else if (key === "arrowright" || key === "d") {
      event.preventDefault();
      navigateImages(overlay, 1);
    }
  });
}

function navigateImages(overlay: Element, direction: -1 | 1): void {
  const thumbnails = overlay.querySelectorAll<HTMLImageElement>(`.${gridClass} img`);
  if (thumbnails.length <= 1) return;

  const currentIndex = getSelectedIndex(overlay);
  const targetIndex = (currentIndex + direction + thumbnails.length) % thumbnails.length;
  const targetThumbnail = thumbnails[targetIndex];
  if (!targetThumbnail) return;

  targetThumbnail.click();
  targetThumbnail.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function getSelectedIndex(overlay: Element): number {
  const selected = overlay.querySelector<HTMLImageElement>(`.${gridClass} img.${selectedClass}`);
  const index = Number(selected?.dataset.index);
  return Number.isInteger(index) ? index : 0;
}
