import { createPanelHeading, ensureSection, moveContents } from "./dom";

const CATEGORY_PANELS = [
  { id: "ItemProfileModule", title: "Category Info" },
  { id: "SubmissionsListAdvancedListSettingsModule", title: "Filters" },
];

const DETAIL_GROUPS = [
  {
    className: "gbq-intro",
    panels: [
      { key: "media", title: "Media", modules: ["EmbeddedMedia", "ScreenshotsModule"] },
      { key: "updates", title: "Updates", modules: ["UpdatesModule", "UpdateAddFormRequesterModule"] },
      { key: "files", title: "Files", modules: ["FilesModule", "AlternateFileSourcesModule"] },
    ],
  },
  {
    className: "gbq-body",
    panels: [
      { key: "description", title: "Description", modules: ["ItemProfileModule", "TodosModule", "RequirementsModule", "LikeToggleModule", "ManageCollectionModule"] },
      { key: "comments", title: "Comments", modules: ["PostsListModule"] },
    ],
  },
];

export function arrangeDetailPage(grid: HTMLElement, detailId: string): void {
  const row = grid.querySelector<HTMLElement>(":scope > row");
  const columns = row?.querySelectorAll<HTMLElement>(":scope > column");
  if (row && columns && columns.length >= 3) {
    row.classList.add("gbq-profile");
    columns[0].classList.add("gbq-main");
    columns[1].classList.add("gbq-author");
    columns[2].classList.add("gbq-related");
    arrangeAuthorHeader(columns[1], columns[2]);
    arrangeDetailContent(columns[0], detailId);
    refreshFileDates(columns[0]);
    for (const module of columns[2].querySelectorAll<HTMLElement>(":scope > module.MoreByModule")) {
      const count = String(Math.max(1, module.querySelectorAll(".RecordsGrid > .Record").length));
      if (module.style.getPropertyValue("--gbq-card-count") !== count) module.style.setProperty("--gbq-card-count", count);
    }
  }
}

export function arrangeCategoryPage(grid: HTMLElement): void {
  for (const { id, title } of CATEGORY_PANELS) {
    const module = grid.querySelector<HTMLElement>(`#${id}`);
    if (!module) continue;
    module.classList.add("gbq-content-panel", "gbq-category-panel");
    const nativeHeadings = module.querySelectorAll<HTMLElement>(":scope > h2:not(.gbq-panel-heading)");
    nativeHeadings.forEach((heading) => heading.classList.add("gbq-native-heading"));
    if (module.querySelector(":scope > .gbq-panel-heading")) continue;
    const nativeLink = nativeHeadings[0]?.querySelector<HTMLAnchorElement>("a[href]");
    module.prepend(createPanelHeading(title, nativeLink?.href));
  }
  const categories = grid.querySelector<HTMLElement>("#SubcategoriesListModule");
  if (categories) categories.hidden = categories.textContent?.includes("No subcategories to display.") ?? false;
}

function arrangeDetailContent(main: HTMLElement, detailId: string): void {
  for (const { className, panels } of DETAIL_GROUPS) {
    let group = main.querySelector<HTMLElement>(`:scope > .${className}`);
    if (!group) {
      const isIntro = className === "gbq-intro";
      const anchor = main.querySelector(isIntro ? ":scope > modulegroup, :scope > #UpdatesModule, :scope > #ItemProfileModule, :scope > #FilesModule" : ":scope > .gbq-intro");
      if (!anchor) continue;
      group = document.createElement("div");
      group.className = className;
      for (const { key, title } of panels) {
        group.append(createContentPanel(key, title, key === "updates" ? `/mods/updates/${detailId}` : undefined));
      }
      if (isIntro) anchor.before(group);
      else anchor.after(group);
    }

    for (const { key, modules } of panels) {
      const body = group.querySelector<HTMLElement>(`.gbq-${key}-panel > .gbq-panel-body`)!;
      moveModules(main, body, modules);
    }
  }
}

function refreshFileDates(main: HTMLElement): void {
  for (const file of main.querySelectorAll<HTMLElement>(".gbq-files-panel #FilesModule .File")) {
    const timestamp = file.querySelector("time[datetime]:not(.gbq-file-date)")?.getAttribute("datetime");
    if (!timestamp) continue;
    let absolute = file.querySelector<HTMLTimeElement>(":scope > .gbq-file-date");
    if (!absolute) {
      absolute = document.createElement("time");
      absolute.className = "gbq-file-date";
      file.prepend(absolute);
    }
    if (absolute.dateTime !== timestamp) {
      absolute.dateTime = timestamp;
      absolute.textContent = formatLocalDate(timestamp);
    }
  }
}

function arrangeAuthorHeader(author: HTMLElement, related: HTMLElement): void {
  const metadata = ensureSection(author, "gbq-meta");
  const counts = ensureSection(author, "gbq-counts");
  const countTop = ensureSection(counts, "gbq-count-top", "ul");
  const countBottom = ensureSection(counts, "gbq-count-bottom");
  const comments = ensureSection(countBottom, "gbq-comments", "ul");
  const dates = ensureSection(author, "gbq-dates");
  const identity = ensureSection(author, "gbq-identity");

  const field = (key: string, label: string): HTMLElement => {
    let cell = metadata.querySelector<HTMLElement>(`[data-gbq-field="${key}"]`);
    if (!cell) {
      cell = document.createElement("div");
      cell.className = "gbq-field";
      cell.dataset.gbqField = key;
      if (label) {
        const heading = document.createElement("span");
        heading.className = "gbq-field-label";
        heading.textContent = label;
        cell.append(heading);
      }
      ensureSection(cell, "gbq-inline");
      metadata.append(cell);
    }
    return cell.querySelector<HTMLElement>(".gbq-inline")!;
  };
  const take = (id: string, selector: string, consume: (module: HTMLElement) => void): void => {
    const module = author.querySelector<HTMLElement>(`module#${id}`) ?? related.querySelector<HTMLElement>(`module#${id}`);
    if (!module || module.dataset.gbqExtracted || !module.querySelector(selector)) return;
    consume(module);
    module.dataset.gbqExtracted = "true";
    module.classList.add("gbq-source");
  };

  take("GameModule", ".Content > a", (module) => {
    field("game", "Game").prepend(module.querySelector(".Content > a")!);
  });
  take("GameSubscriptionToggleModule", "button", (module) => {
    field("game", "Game").append(module.querySelector("button")!);
  });
  for (const id of ["CategoryModule", "AdditionalInfoModule"]) {
    const selector = id === "CategoryModule" ? ".Content > dl > dd, .Content > a" : ".Content > dl > dd";
    take(id, selector, (module) => {
      const directCategory = id === "CategoryModule" && module.querySelector(".Content > a");
      if (directCategory) {
        field(`${id}-0`, "Category").append(directCategory);
        return;
      }
      const terms = [...module.querySelectorAll(".Content > dl > dt")].map((term, index) => ({ term, index }));
      if (id === "CategoryModule") terms.reverse();
      for (const { term, index } of terms) {
        const value = term.nextElementSibling;
        if (value?.tagName === "DD") moveContents(value, field(`${id}-${index}`, term.textContent?.trim() ?? ""));
      }
    });
  }
  take("TagsModule", ".Content > a", (module) => {
    moveContents(module.querySelector(".Content")!, field("tags", "Tags"));
  });
  take("FeaturingsModule", ".Content li", (module) => {
    const target = field("features", "");
    for (const item of module.querySelectorAll(".Content li")) moveContents(item, target);
  });

  take("StatsModule", "li.CountStat, li.TimeStat", (module) => {
    for (const className of ["LikeCount", "DownloadCount", "ViewCount", "PostCount"]) {
      const source = module.querySelector(`li.${className}`);
      if (!source) continue;
      const badge = document.createElement("li");
      badge.className = "gbq-stat";
      badge.title = className.replace("Count", "");
      moveContents(source, badge);
      (className === "PostCount" ? comments : countTop).append(badge);
    }
    const timeStats = [...module.querySelectorAll("li.TimeStat")];
    const definitions = [
      { name: "Created", source: timeStats.find((item) => item.classList.contains("DateAdded")), icon: "MiscIcon SubmitIcon" },
      { name: "Updated", source: timeStats.find((item) => item.querySelector(".UpdatesIcon")), icon: "SubnavigatorIcon UpdatesIcon" },
      { name: "Modified", source: timeStats.find((item) => item.querySelector(".EditIcon")), icon: "SubnavigatorIcon EditIcon" },
    ];
    for (const { name, source, icon } of definitions) {
      const row = document.createElement("div");
      row.className = "gbq-date-row";
      row.title = name;
      const badge = document.createElement("span");
      badge.className = "gbq-stat";
      const absolute = document.createElement("span");
      absolute.className = "gbq-date-absolute";
      const timestamp = source?.querySelector("time")?.getAttribute("datetime");
      absolute.textContent = timestamp ? formatLocalDate(timestamp) : "—";
      if (source) moveContents(source, badge);
      else {
        const sprite = document.createElement("spriteicon");
        sprite.className = icon;
        badge.append(sprite, "—");
      }
      row.append(badge, absolute);
      dates.append(row);
    }
  });
  take("SubmissionSubscriptionToggleModule", "button", (module) => {
    countBottom.append(module.querySelector("button")!);
  });

  for (const id of ["SubmitterModule", "DonationMethodsModule", "BuddyToggleModule", "SubmitterSubscriptionToggleModule", "ThanksToggleModule", "AuthorsAndRolesModule"]) {
    take(id, ".Content > *", (module) => {
      const component = ensureSection(identity, `gbq-component-${id}`);
      component.classList.add("gbq-component");
      if (id === "AuthorsAndRolesModule") {
        const label = document.createElement("span");
        label.className = "gbq-field-label";
        label.textContent = "Credits";
        component.append(label);
      }
      if (id === "DonationMethodsModule") {
        for (const item of module.querySelectorAll(".Content li")) moveContents(item, component);
      } else moveContents(module.querySelector(".Content")!, component);
    });
  }
  const credits = identity.querySelector(".gbq-component-AuthorsAndRolesModule");
  if (credits?.nextElementSibling) identity.append(credits);
}

function formatLocalDate(value: string): string {
  const date = new Date(value);
  const pad = (part: number): string => String(part).padStart(2, "0");
  const offset = -date.getTimezoneOffset();
  const zone = `${offset >= 0 ? "+" : "-"}${pad(Math.floor(Math.abs(offset) / 60))}${pad(Math.abs(offset) % 60)}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())} (${zone})`;
}


function createContentPanel(key: string, title: string, href?: string): HTMLElement {
  const panel = document.createElement("section");
  panel.className = `gbq-content-panel gbq-${key}-panel`;
  const heading = createPanelHeading(title, href);
  heading.id = `gbq-${key}-heading`;
  panel.setAttribute("aria-labelledby", heading.id);
  const body = document.createElement("div");
  body.className = "gbq-panel-body";
  panel.append(heading, body);
  return panel;
}

function moveModules(source: ParentNode, target: HTMLElement, ids: readonly string[]): void {
  const modules = ids.map((id) => source.querySelector<HTMLElement>(`module#${id}`)).filter((module): module is HTMLElement => module !== null);
  for (const [index, module] of modules.entries()) {
    module.classList.add("gbq-panel-module");
    const position = target.children[index] ?? null;
    if (position !== module) target.insertBefore(module, position);
  }
}
