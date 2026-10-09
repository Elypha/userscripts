import { GM_addStyle } from "$";

import { createButton } from "./dom";
import { handleGalleryClick, handleKeyboard, refreshDetailGallery } from "./gallery";
import { arrangeCategoryPage, arrangeDetailPage } from "./layout";
import styleText from "./style.scss?inline";

const detailId = location.pathname.match(/^\/mods\/(\d+)\/?$/)?.[1];
const isCategory = /^\/mods\/cats\/\d+\/?$/.test(location.pathname);

if (detailId || isCategory) main();

function main(): void {
  GM_addStyle(styleText);
  document.body.classList.add("gbq", detailId ? "gbq-detail" : "gbq-category");

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refreshPage();
    });
  });
  observer.observe(document.getElementById("MainContentWrapper") ?? document.body, { childList: true, subtree: true });
  refreshPage();

  document.addEventListener("click", handleGalleryClick);
  document.addEventListener("keydown", handleKeyboard, true);
}

function refreshPage(): void {
  const grid = document.getElementById("ContentGrid");
  if (!grid) return;

  if (isCategory) {
    arrangeCategoryPage(grid);
  } else if (detailId) {
    arrangeDetailPage(grid, detailId);
    refreshDetailGallery(grid, detailId);
  }

  for (const wrapper of grid.querySelectorAll<HTMLElement>(".Record .PreviewWrapper")) {
    const preview = wrapper.querySelector<HTMLImageElement>("img.PreviewImage");
    if (preview && isCategory && preview.src.includes("_220.webp") && !preview.dataset.gbqHires) {
      const original = preview.src;
      preview.dataset.gbqHires = "true";
      preview.addEventListener("error", () => { preview.src = original; }, { once: true });
      preview.src = original.replace("_220.webp", "_530.webp");
    }
    if (wrapper.querySelector(".gbq-open")) continue;
    const link = wrapper.querySelector<HTMLAnchorElement>("a.Preview[href]");
    const id = link && new URL(link.href).pathname.match(/^\/mods\/(\d+)\/?$/)?.[1];
    if (!id) continue;
    const button = createButton("Gallery", "gbq-open");
    button.dataset.modId = id;
    button.dataset.modName = link.querySelector("img")?.alt ?? "Gallery";
    button.title = "View all images";
    wrapper.append(button);
  }
}

