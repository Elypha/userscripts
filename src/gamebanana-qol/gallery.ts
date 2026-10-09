import { createButton } from "./dom";

interface GalleryImage {
  full: string;
  thumbnail: string;
}

interface Gallery {
  name: string;
  images: GalleryImage[];
}

interface ModProfile {
  _sName: string;
  _aPreviewContent?: {
    screenshots?: Array<{ _sBaseUrl: string; _sFile: string; _sFile100?: string; _sFile220?: string }>;
  };
}

interface ImageTask {
  url: string;
  state: "queued" | "loading" | "loaded" | "error";
  promise: Promise<boolean>;
  resolve: (loaded: boolean) => void;
}

interface Viewer {
  element: HTMLDivElement;
  title: HTMLSpanElement;
  counter: HTMLSpanElement;
  status: HTMLSpanElement;
  retry: HTMLButtonElement;
  image: HTMLImageElement;
  grid: HTMLDivElement;
  previous: HTMLButtonElement;
  next: HTMLButtonElement;
  gallery: Gallery;
  index: number;
  restoreFocus: Element | null;
  loader: () => Promise<Gallery>;
}

const galleries = new Map<string, Promise<Gallery>>();
const imageTasks = new Map<string, ImageTask>();
const imageQueue: ImageTask[] = [];
let activeLoads = 0;
let detailGallery: Gallery | undefined;
let viewer: Viewer | undefined;

export function handleGalleryClick(event: MouseEvent): void {
  const button = (event.target as Element).closest<HTMLButtonElement>("button.gbq-open");
  if (!button) return;
  event.preventDefault();
  const id = button.dataset.modId;
  if (id) openViewer(() => getModGallery(id), button.dataset.modName ?? "Gallery");
  else if (detailGallery) openViewer(() => Promise.resolve(detailGallery!), detailGallery.name);
}

export function refreshDetailGallery(grid: HTMLElement, detailId: string): void {
  const gallery = grid.querySelector<HTMLElement>(".Gallery:has(a.PrimaryPreview)");
  if (!gallery) return;
  const links = [...gallery.querySelectorAll<HTMLAnchorElement>("a.PrimaryPreview, a.SecondaryPreview")];
  const images = links.map((link) => ({ full: link.href, thumbnail: link.querySelector("img")?.src ?? link.href }));
  if (!images.length) return;
  const name = links[0].querySelector("img")?.alt ?? "Gallery";
  if (detailGallery?.images.map((image) => image.full).join("|") !== images.map((image) => image.full).join("|")) {
    detailGallery = { name, images };
    if (detailId) galleries.set(detailId, Promise.resolve(detailGallery));
    preloadGallery(detailGallery);
  }

  const module = gallery.closest("module");
  module?.classList.add("gbq-gallery");
  if (!module?.querySelector(".gbq-open")) {
    const button = createButton("Gallery · Tab", "gbq-open gbq-detail-open");
    gallery.before(button);
  }
  const primary = links[0].querySelector("img");
  if (primary && primary.dataset.gbqOriginal !== links[0].href) {
    primary.dataset.gbqOriginal = links[0].href;
    void loadImage(links[0].href, true).then((loaded) => {
      if (loaded && primary.isConnected) primary.src = links[0].href;
    });
  }
}

async function getModGallery(id: string): Promise<Gallery> {
  let result = galleries.get(id);
  if (!result) {
    result = fetch(`/apiv13/Mod/${id}/ProfilePage`, { credentials: "same-origin" }).then(async (response) => {
      if (!response.ok) throw new Error(`Could not load gallery (${response.status}).`);
      const profile = await response.json() as ModProfile;
      const images = (profile._aPreviewContent?.screenshots ?? []).map((image) => ({
        full: `${image._sBaseUrl}/${image._sFile}`,
        thumbnail: `${image._sBaseUrl}/${image._sFile100 ?? image._sFile220 ?? image._sFile}`,
      }));
      return { name: profile._sName, images };
    }).catch((error: unknown) => {
      galleries.delete(id);
      throw error;
    });
    galleries.set(id, result);
  }
  return result;
}

function loadImage(url: string, prioritise = false): Promise<boolean> {
  let task = imageTasks.get(url);
  if (!task || (prioritise && task.state === "error")) {
    let resolve!: ImageTask["resolve"];
    const promise = new Promise<boolean>((done) => { resolve = done; });
    task = { url, state: "queued", promise, resolve };
    imageTasks.set(url, task);
    imageQueue.push(task);
  }
  if (prioritise && task.state === "queued") {
    imageQueue.splice(imageQueue.indexOf(task), 1);
    imageQueue.unshift(task);
  }
  pumpImages();
  return task.promise;
}

function pumpImages(): void {
  while (activeLoads < 4 && imageQueue.length) {
    const task = imageQueue.shift()!;
    task.state = "loading";
    activeLoads++;
    const image = new Image();
    image.decoding = "async";
    const finish = (loaded: boolean): void => {
      task.state = loaded ? "loaded" : "error";
      activeLoads--;
      task.resolve(loaded);
      pumpImages();
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = task.url;
  }
}

function preloadGallery(gallery: Gallery): void {
  for (const image of gallery.images) {
    void loadImage(image.full).then(() => { if (viewer) updateStatus(viewer); });
  }
}

function openViewer(loader: Viewer["loader"], name: string): void {
  if (viewer) closeViewer();
  const element = document.createElement("div");
  element.className = "gbq-viewer";
  element.tabIndex = -1;
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-modal", "true");
  element.setAttribute("aria-label", "Image gallery");
  const header = document.createElement("div");
  header.className = "gbq-viewer-header";
  const title = document.createElement("span");
  title.className = "gbq-viewer-title";
  title.textContent = name;
  const counter = document.createElement("span");
  const status = document.createElement("span");
  status.className = "gbq-viewer-status";
  status.setAttribute("aria-live", "polite");
  const retry = createButton("Retry");
  retry.hidden = true;
  const close = createButton("×");
  close.title = "Close (Tab / Esc)";
  close.setAttribute("aria-label", "Close gallery");
  close.addEventListener("click", closeViewer);
  header.append(title, counter, status, retry, close);

  const stage = document.createElement("div");
  stage.className = "gbq-viewer-stage";
  const previous = createButton("‹");
  previous.setAttribute("aria-label", "Previous image");
  previous.title = "Previous (← / A)";
  const next = createButton("›");
  next.setAttribute("aria-label", "Next image");
  next.title = "Next (→ / D)";
  previous.hidden = next.hidden = true;
  const image = document.createElement("img");
  image.hidden = true;
  stage.append(previous, image, next);
  const grid = document.createElement("div");
  grid.className = "gbq-viewer-grid";
  element.append(header, stage, grid);

  const current: Viewer = { element, title, counter, status, retry, image, grid, previous, next, gallery: { name, images: [] }, index: 0, restoreFocus: document.activeElement, loader };
  viewer = current;
  previous.addEventListener("click", () => selectImage(current, current.index - 1));
  next.addEventListener("click", () => selectImage(current, current.index + 1));
  retry.addEventListener("click", () => {
    if (current.gallery.images.length) selectImage(current, current.index);
    else void populateViewer(current);
  });
  element.addEventListener("click", (event) => {
    if (event.target === element || event.target === stage) closeViewer();
  });
  document.body.append(element);
  document.documentElement.classList.add("gbq-viewer-open");
  element.focus({ preventScroll: true });
  void populateViewer(current);
}

async function populateViewer(current: Viewer): Promise<void> {
  current.status.textContent = "Loading gallery…";
  current.retry.hidden = true;
  try {
    const gallery = await current.loader();
    if (viewer !== current) return;
    current.gallery = gallery;
    current.title.textContent = gallery.name;
    if (!gallery.images.length) {
      current.status.textContent = "No images available.";
      return;
    }
    for (const [index, image] of gallery.images.entries()) {
      const thumbnail = createButton("", "gbq-thumbnail");
      thumbnail.title = `Image ${index + 1}`;
      thumbnail.setAttribute("aria-label", thumbnail.title);
      const preview = document.createElement("img");
      preview.src = image.thumbnail;
      preview.alt = "";
      preview.decoding = "async";
      thumbnail.append(preview);
      thumbnail.addEventListener("click", () => selectImage(current, index));
      current.grid.append(thumbnail);
    }
    current.image.hidden = false;
    current.previous.hidden = current.next.hidden = gallery.images.length < 2;
    selectImage(current, 0);
    preloadGallery(gallery);
  } catch (error) {
    if (viewer !== current) return;
    current.status.textContent = error instanceof Error ? error.message : "Could not load gallery.";
    current.retry.hidden = false;
  }
}

function selectImage(current: Viewer, index: number): void {
  const images = current.gallery.images;
  if (!images.length) return;
  current.index = (index + images.length) % images.length;
  const image = images[current.index];
  current.image.alt = `${current.gallery.name} - ${current.index + 1} / ${images.length}`;
  current.image.src = imageTasks.get(image.full)?.state === "loaded" ? image.full : image.thumbnail;
  current.counter.textContent = `${current.index + 1} / ${images.length}`;
  current.grid.querySelector('[aria-current="true"]')?.removeAttribute("aria-current");
  const thumbnail = current.grid.children[current.index];
  thumbnail?.setAttribute("aria-current", "true");
  thumbnail?.scrollIntoView({ block: "nearest" });
  const loaded = loadImage(image.full, true);
  updateStatus(current);
  void loaded.then((success) => {
    if (viewer !== current || images[current.index].full !== image.full) return;
    if (success) current.image.src = image.full;
    updateStatus(current);
  });
}

function updateStatus(current: Viewer): void {
  const images = current.gallery.images;
  if (!images.length) return;
  const loaded = images.filter((image) => imageTasks.get(image.full)?.state === "loaded").length;
  const state = imageTasks.get(images[current.index].full)?.state;
  const message = state === "loaded" ? "Original" : state === "error" ? "Original failed to load" : "Loading original…";
  current.status.textContent = `${message} · ${loaded} / ${images.length} preloaded`;
  current.retry.hidden = state !== "error";
}

function closeViewer(): void {
  if (!viewer) return;
  const previous = viewer.restoreFocus;
  viewer.element.remove();
  viewer = undefined;
  document.documentElement.classList.remove("gbq-viewer-open");
  if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
}

export function handleKeyboard(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  const target = event.target;
  if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return;
  const key = event.key.toLowerCase();
  if (key === "tab" && (viewer || detailGallery)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;
    if (viewer) closeViewer();
    else if (detailGallery) openViewer(() => Promise.resolve(detailGallery!), detailGallery.name);
  } else if (viewer && ["escape", "arrowleft", "arrowright", "a", "d"].includes(key)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (key === "escape") closeViewer();
    else selectImage(viewer, viewer.index + (key === "arrowleft" || key === "a" ? -1 : 1));
  }
}
