// ==UserScript==
// @name         gamebanana.com: QOL
// @namespace    https://github.com/Elypha/userscripts
// @version      0.1.0
// @author       Elypha
// @description  Compact mod pages with a three-column list, horizontal sidebars, and a preloaded image gallery.
// @license      Apache-2.0
// @homepageURL  https://github.com/Elypha/userscripts
// @supportURL   https://github.com/Elypha/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/gamebanana.com-QOL.user.js
// @updateURL    https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/gamebanana.com-QOL.meta.js
// @match        https://gamebanana.com/mods/*
// @match        https://www.gamebanana.com/mods/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
	"use strict";
	var _GM_addStyle = (() => typeof GM_addStyle != "undefined" ? GM_addStyle : void 0)();
	function createButton(text, className = "") {
		const button = document.createElement("button");
		button.type = "button";
		button.textContent = text;
		button.className = className;
		return button;
	}
	function createPanelHeading(title, href) {
		const heading = document.createElement("h2");
		heading.className = "gbq-panel-heading";
		if (href) {
			const link = document.createElement("a");
			link.href = href;
			link.textContent = title;
			heading.append(link);
		} else heading.textContent = title;
		return heading;
	}
	function ensureSection(parent, className, tag = "div") {
		let section = parent.querySelector(`:scope > .${className}`);
		if (!section) {
			section = document.createElement(tag);
			section.className = className;
			parent.append(section);
		}
		return section;
	}
	function moveContents(source, target) {
		target.append(...source.childNodes);
	}
	var galleries = new Map();
	var imageTasks = new Map();
	var imageQueue = [];
	var activeLoads = 0;
	var detailGallery;
	var viewer;
	function handleGalleryClick(event) {
		const button = event.target.closest("button.gbq-open");
		if (!button) return;
		event.preventDefault();
		const id = button.dataset.modId;
		if (id) openViewer(() => getModGallery(id), button.dataset.modName ?? "Gallery");
		else if (detailGallery) openViewer(() => Promise.resolve(detailGallery), detailGallery.name);
	}
	function refreshDetailGallery(grid, detailId) {
		const gallery = grid.querySelector(".Gallery:has(a.PrimaryPreview)");
		if (!gallery) return;
		const links = [...gallery.querySelectorAll("a.PrimaryPreview, a.SecondaryPreview")];
		const images = links.map((link) => ({
			full: link.href,
			thumbnail: link.querySelector("img")?.src ?? link.href
		}));
		if (!images.length) return;
		const name = links[0].querySelector("img")?.alt ?? "Gallery";
		if (detailGallery?.images.map((image) => image.full).join("|") !== images.map((image) => image.full).join("|")) {
			detailGallery = {
				name,
				images
			};
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
			loadImage(links[0].href, true).then((loaded) => {
				if (loaded && primary.isConnected) primary.src = links[0].href;
			});
		}
	}
	async function getModGallery(id) {
		let result = galleries.get(id);
		if (!result) {
			result = fetch(`/apiv13/Mod/${id}/ProfilePage`, { credentials: "same-origin" }).then(async (response) => {
				if (!response.ok) throw new Error(`Could not load gallery (${response.status}).`);
				const profile = await response.json();
				const images = (profile._aPreviewContent?.screenshots ?? []).map((image) => ({
					full: `${image._sBaseUrl}/${image._sFile}`,
					thumbnail: `${image._sBaseUrl}/${image._sFile100 ?? image._sFile220 ?? image._sFile}`
				}));
				return {
					name: profile._sName,
					images
				};
			}).catch((error) => {
				galleries.delete(id);
				throw error;
			});
			galleries.set(id, result);
		}
		return result;
	}
	function loadImage(url, prioritise = false) {
		let task = imageTasks.get(url);
		if (!task || prioritise && task.state === "error") {
			let resolve;
			task = {
				url,
				state: "queued",
				promise: new Promise((done) => {
					resolve = done;
				}),
				resolve
			};
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
	function pumpImages() {
		while (activeLoads < 4 && imageQueue.length) {
			const task = imageQueue.shift();
			task.state = "loading";
			activeLoads++;
			const image = new Image();
			image.decoding = "async";
			const finish = (loaded) => {
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
	function preloadGallery(gallery) {
		for (const image of gallery.images) loadImage(image.full).then(() => {
			if (viewer) updateStatus(viewer);
		});
	}
	function openViewer(loader, name) {
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
		const current = {
			element,
			title,
			counter,
			status,
			retry,
			image,
			grid,
			previous,
			next,
			gallery: {
				name,
				images: []
			},
			index: 0,
			restoreFocus: document.activeElement,
			loader
		};
		viewer = current;
		previous.addEventListener("click", () => selectImage(current, current.index - 1));
		next.addEventListener("click", () => selectImage(current, current.index + 1));
		retry.addEventListener("click", () => {
			if (current.gallery.images.length) selectImage(current, current.index);
			else populateViewer(current);
		});
		element.addEventListener("click", (event) => {
			if (event.target === element || event.target === stage) closeViewer();
		});
		document.body.append(element);
		document.documentElement.classList.add("gbq-viewer-open");
		element.focus({ preventScroll: true });
		populateViewer(current);
	}
	async function populateViewer(current) {
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
	function selectImage(current, index) {
		const images = current.gallery.images;
		if (!images.length) return;
		current.index = (index + images.length) % images.length;
		const image = images[current.index];
		current.image.alt = `${current.gallery.name} - ${current.index + 1} / ${images.length}`;
		current.image.src = imageTasks.get(image.full)?.state === "loaded" ? image.full : image.thumbnail;
		current.counter.textContent = `${current.index + 1} / ${images.length}`;
		current.grid.querySelector("[aria-current=\"true\"]")?.removeAttribute("aria-current");
		const thumbnail = current.grid.children[current.index];
		thumbnail?.setAttribute("aria-current", "true");
		thumbnail?.scrollIntoView({ block: "nearest" });
		const loaded = loadImage(image.full, true);
		updateStatus(current);
		loaded.then((success) => {
			if (viewer !== current || images[current.index].full !== image.full) return;
			if (success) current.image.src = image.full;
			updateStatus(current);
		});
	}
	function updateStatus(current) {
		const images = current.gallery.images;
		if (!images.length) return;
		const loaded = images.filter((image) => imageTasks.get(image.full)?.state === "loaded").length;
		const state = imageTasks.get(images[current.index].full)?.state;
		const message = state === "loaded" ? "Original" : state === "error" ? "Original failed to load" : "Loading original…";
		current.status.textContent = `${message} · ${loaded} / ${images.length} preloaded`;
		current.retry.hidden = state !== "error";
	}
	function closeViewer() {
		if (!viewer) return;
		const previous = viewer.restoreFocus;
		viewer.element.remove();
		viewer = void 0;
		document.documentElement.classList.remove("gbq-viewer-open");
		if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
	}
	function handleKeyboard(event) {
		if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
		const target = event.target;
		if (target instanceof Element && target.closest("input, textarea, select, [contenteditable]:not([contenteditable=\"false\"]), [role=\"textbox\"]")) return;
		const key = event.key.toLowerCase();
		if (key === "tab" && (viewer || detailGallery)) {
			event.preventDefault();
			event.stopImmediatePropagation();
			if (event.repeat) return;
			if (viewer) closeViewer();
			else if (detailGallery) openViewer(() => Promise.resolve(detailGallery), detailGallery.name);
		} else if (viewer && [
			"escape",
			"arrowleft",
			"arrowright",
			"a",
			"d"
		].includes(key)) {
			event.preventDefault();
			event.stopImmediatePropagation();
			if (key === "escape") closeViewer();
			else selectImage(viewer, viewer.index + (key === "arrowleft" || key === "a" ? -1 : 1));
		}
	}
	var CATEGORY_PANELS = [{
		id: "ItemProfileModule",
		title: "Category Info"
	}, {
		id: "SubmissionsListAdvancedListSettingsModule",
		title: "Filters"
	}];
	var DETAIL_GROUPS = [{
		className: "gbq-intro",
		panels: [
			{
				key: "media",
				title: "Media",
				modules: ["EmbeddedMedia", "ScreenshotsModule"]
			},
			{
				key: "updates",
				title: "Updates",
				modules: ["UpdatesModule", "UpdateAddFormRequesterModule"]
			},
			{
				key: "files",
				title: "Files",
				modules: ["FilesModule", "AlternateFileSourcesModule"]
			}
		]
	}, {
		className: "gbq-body",
		panels: [{
			key: "description",
			title: "Description",
			modules: [
				"ItemProfileModule",
				"TodosModule",
				"RequirementsModule",
				"LikeToggleModule",
				"ManageCollectionModule"
			]
		}, {
			key: "comments",
			title: "Comments",
			modules: ["PostsListModule"]
		}]
	}];
	function arrangeDetailPage(grid, detailId) {
		const row = grid.querySelector(":scope > row");
		const columns = row?.querySelectorAll(":scope > column");
		if (row && columns && columns.length >= 3) {
			row.classList.add("gbq-profile");
			columns[0].classList.add("gbq-main");
			columns[1].classList.add("gbq-author");
			columns[2].classList.add("gbq-related");
			arrangeAuthorHeader(columns[1], columns[2]);
			arrangeDetailContent(columns[0], detailId);
			refreshFileDates(columns[0]);
			for (const module of columns[2].querySelectorAll(":scope > module.MoreByModule")) {
				const count = String(Math.max(1, module.querySelectorAll(".RecordsGrid > .Record").length));
				if (module.style.getPropertyValue("--gbq-card-count") !== count) module.style.setProperty("--gbq-card-count", count);
			}
		}
	}
	function arrangeCategoryPage(grid) {
		for (const { id, title } of CATEGORY_PANELS) {
			const module = grid.querySelector(`#${id}`);
			if (!module) continue;
			module.classList.add("gbq-content-panel", "gbq-category-panel");
			const nativeHeadings = module.querySelectorAll(":scope > h2:not(.gbq-panel-heading)");
			nativeHeadings.forEach((heading) => heading.classList.add("gbq-native-heading"));
			if (module.querySelector(":scope > .gbq-panel-heading")) continue;
			const nativeLink = nativeHeadings[0]?.querySelector("a[href]");
			module.prepend(createPanelHeading(title, nativeLink?.href));
		}
		const categories = grid.querySelector("#SubcategoriesListModule");
		if (categories) categories.hidden = categories.textContent?.includes("No subcategories to display.") ?? false;
	}
	function arrangeDetailContent(main, detailId) {
		for (const { className, panels } of DETAIL_GROUPS) {
			let group = main.querySelector(`:scope > .${className}`);
			if (!group) {
				const isIntro = className === "gbq-intro";
				const anchor = main.querySelector(isIntro ? ":scope > modulegroup, :scope > #UpdatesModule, :scope > #ItemProfileModule, :scope > #FilesModule" : ":scope > .gbq-intro");
				if (!anchor) continue;
				group = document.createElement("div");
				group.className = className;
				for (const { key, title } of panels) group.append(createContentPanel(key, title, key === "updates" ? `/mods/updates/${detailId}` : void 0));
				if (isIntro) anchor.before(group);
				else anchor.after(group);
			}
			for (const { key, modules } of panels) moveModules(main, group.querySelector(`.gbq-${key}-panel > .gbq-panel-body`), modules);
		}
	}
	function refreshFileDates(main) {
		for (const file of main.querySelectorAll(".gbq-files-panel #FilesModule .File")) {
			const timestamp = file.querySelector("time[datetime]:not(.gbq-file-date)")?.getAttribute("datetime");
			if (!timestamp) continue;
			let absolute = file.querySelector(":scope > .gbq-file-date");
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
	function arrangeAuthorHeader(author, related) {
		const metadata = ensureSection(author, "gbq-meta");
		const counts = ensureSection(author, "gbq-counts");
		const countTop = ensureSection(counts, "gbq-count-top", "ul");
		const countBottom = ensureSection(counts, "gbq-count-bottom");
		const comments = ensureSection(countBottom, "gbq-comments", "ul");
		const dates = ensureSection(author, "gbq-dates");
		const identity = ensureSection(author, "gbq-identity");
		const field = (key, label) => {
			let cell = metadata.querySelector(`[data-gbq-field="${key}"]`);
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
			return cell.querySelector(".gbq-inline");
		};
		const take = (id, selector, consume) => {
			const module = author.querySelector(`module#${id}`) ?? related.querySelector(`module#${id}`);
			if (!module || module.dataset.gbqExtracted || !module.querySelector(selector)) return;
			consume(module);
			module.dataset.gbqExtracted = "true";
			module.classList.add("gbq-source");
		};
		take("GameModule", ".Content > a", (module) => {
			field("game", "Game").prepend(module.querySelector(".Content > a"));
		});
		take("GameSubscriptionToggleModule", "button", (module) => {
			field("game", "Game").append(module.querySelector("button"));
		});
		for (const id of ["CategoryModule", "AdditionalInfoModule"]) take(id, id === "CategoryModule" ? ".Content > dl > dd, .Content > a" : ".Content > dl > dd", (module) => {
			const directCategory = id === "CategoryModule" && module.querySelector(".Content > a");
			if (directCategory) {
				field(`${id}-0`, "Category").append(directCategory);
				return;
			}
			const terms = [...module.querySelectorAll(".Content > dl > dt")].map((term, index) => ({
				term,
				index
			}));
			if (id === "CategoryModule") terms.reverse();
			for (const { term, index } of terms) {
				const value = term.nextElementSibling;
				if (value?.tagName === "DD") moveContents(value, field(`${id}-${index}`, term.textContent?.trim() ?? ""));
			}
		});
		take("TagsModule", ".Content > a", (module) => {
			moveContents(module.querySelector(".Content"), field("tags", "Tags"));
		});
		take("FeaturingsModule", ".Content li", (module) => {
			const target = field("features", "");
			for (const item of module.querySelectorAll(".Content li")) moveContents(item, target);
		});
		take("StatsModule", "li.CountStat, li.TimeStat", (module) => {
			for (const className of [
				"LikeCount",
				"DownloadCount",
				"ViewCount",
				"PostCount"
			]) {
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
				{
					name: "Created",
					source: timeStats.find((item) => item.classList.contains("DateAdded")),
					icon: "MiscIcon SubmitIcon"
				},
				{
					name: "Updated",
					source: timeStats.find((item) => item.querySelector(".UpdatesIcon")),
					icon: "SubnavigatorIcon UpdatesIcon"
				},
				{
					name: "Modified",
					source: timeStats.find((item) => item.querySelector(".EditIcon")),
					icon: "SubnavigatorIcon EditIcon"
				}
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
			countBottom.append(module.querySelector("button"));
		});
		for (const id of [
			"SubmitterModule",
			"DonationMethodsModule",
			"BuddyToggleModule",
			"SubmitterSubscriptionToggleModule",
			"ThanksToggleModule",
			"AuthorsAndRolesModule"
		]) take(id, ".Content > *", (module) => {
			const component = ensureSection(identity, `gbq-component-${id}`);
			component.classList.add("gbq-component");
			if (id === "AuthorsAndRolesModule") {
				const label = document.createElement("span");
				label.className = "gbq-field-label";
				label.textContent = "Credits";
				component.append(label);
			}
			if (id === "DonationMethodsModule") for (const item of module.querySelectorAll(".Content li")) moveContents(item, component);
			else moveContents(module.querySelector(".Content"), component);
		});
		const credits = identity.querySelector(".gbq-component-AuthorsAndRolesModule");
		if (credits?.nextElementSibling) identity.append(credits);
	}
	function formatLocalDate(value) {
		const date = new Date(value);
		const pad = (part) => String(part).padStart(2, "0");
		const offset = -date.getTimezoneOffset();
		const zone = `${offset >= 0 ? "+" : "-"}${pad(Math.floor(Math.abs(offset) / 60))}${pad(Math.abs(offset) % 60)}`;
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())} (${zone})`;
	}
	function createContentPanel(key, title, href) {
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
	function moveModules(source, target, ids) {
		const modules = ids.map((id) => source.querySelector(`module#${id}`)).filter((module) => module !== null);
		for (const [index, module] of modules.entries()) {
			module.classList.add("gbq-panel-module");
			const position = target.children[index] ?? null;
			if (position !== module) target.insertBefore(module, position);
		}
	}
	var style_default = "body.gbq {\n  --gbq-line: #43515c;\n  --gbq-cell-bg: #1c282f;\n  --gbq-heading: #dce5eb;\n  --gbq-muted: #a7b4be;\n  --gbq-accent: #f6d85f;\n}\nbody.gbq #BodyWrapper {\n  box-sizing: border-box;\n  width: calc(100% - 32px) !important;\n  max-width: 1440px !important;\n  margin-inline: auto !important;\n}\nbody.gbq #MainContent,\nbody.gbq #PrimaryNav {\n  width: 100% !important;\n  max-width: none !important;\n  margin-inline: 0 !important;\n}\nbody.gbq #ContentGrid :is(module, modulegroup):empty {\n  display: none !important;\n}\nbody.gbq #MainContentWrapper {\n  width: 100%;\n}\nbody.gbq #HeadlineWrapper {\n  height: 100px !important;\n  min-height: 100px !important;\n  overflow: hidden;\n}\nbody.gbq #Headline {\n  position: relative;\n  z-index: 1;\n  display: flex !important;\n  flex-direction: column;\n  align-items: flex-start;\n  justify-content: center;\n  box-sizing: border-box;\n  height: 100%;\n  min-height: 0 !important;\n  margin: 0 !important;\n  padding: 8px 20px !important;\n  gap: 6px;\n}\nbody.gbq #PageTitle {\n  margin: 0 !important;\n  font-size: 28px !important;\n  line-height: 1.15;\n}\nbody.gbq #Breadcrumb {\n  position: static !important;\n  align-self: flex-start !important;\n  margin: 0 !important;\n  padding: 4px 8px;\n  font-size: 11px;\n}\nbody.gbq #HeadlineBackground {\n  position: absolute;\n  inset: 0;\n  width: 100%;\n  height: 100% !important;\n  object-fit: cover;\n}\nbody.gbq #ContentGrid {\n  min-width: 0;\n}\nbody.gbq .gbq-content-panel {\n  box-sizing: border-box;\n  min-width: 0;\n  min-height: 160px;\n  overflow-wrap: anywhere;\n  border: 1px solid var(--gbq-line);\n  border-radius: 4px;\n  background: var(--gbq-cell-bg);\n}\nbody.gbq .gbq-panel-heading {\n  margin: 0;\n  padding: 12px 16px;\n  border-bottom: 1px solid var(--gbq-line);\n  color: var(--gbq-heading);\n  font-size: 16px;\n  font-weight: 700;\n  line-height: 22px;\n}\nbody.gbq .gbq-panel-heading::after {\n  display: none;\n}\nbody.gbq .gbq-open {\n  padding: 5px 10px;\n  border: 1px solid rgba(255, 255, 255, 0.25);\n  border-radius: 4px;\n  background: rgba(15, 23, 29, 0.9);\n  color: var(--gbq-accent);\n  font: inherit;\n  font-size: 12px;\n  cursor: pointer;\n}\nbody.gbq .gbq-open:hover, body.gbq .gbq-open:focus-visible {\n  border-color: var(--gbq-accent);\n  background: #25343e;\n}\nbody.gbq .PreviewWrapper > .gbq-open {\n  position: absolute;\n  right: 8px;\n  bottom: 8px;\n  z-index: 2;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);\n}\n\nbody.gbq-category #ContentGrid {\n  display: flex;\n  flex-direction: column;\n}\nbody.gbq-category #ContentGrid > div:first-child {\n  order: 1;\n  width: 100%;\n  min-width: 0;\n}\nbody.gbq-category #AuxiliaryColumn {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: stretch;\n  order: 0;\n  box-sizing: border-box;\n  width: 100%;\n  margin-bottom: 16px;\n  padding: 0;\n  gap: 0;\n}\nbody.gbq-category #AuxiliaryColumn > module {\n  flex-basis: 100%;\n  width: 100%;\n}\nbody.gbq-category .gbq-category-panel {\n  min-height: 0;\n  margin: 0;\n  padding: 0;\n}\nbody.gbq-category .gbq-category-panel > .gbq-native-heading {\n  display: none;\n}\nbody.gbq-category .gbq-category-panel > .Content {\n  margin: 0;\n  padding: 14px;\n}\nbody.gbq-category :is(#ItemProfileModule, #SubmissionsListAdvancedListSettingsModule).gbq-category-panel {\n  display: flex;\n  align-items: stretch;\n}\nbody.gbq-category :is(#ItemProfileModule, #SubmissionsListAdvancedListSettingsModule).gbq-category-panel > .gbq-panel-heading {\n  display: flex;\n  flex: 0 0 132px;\n  align-items: center;\n  box-sizing: border-box;\n  padding: 10px 14px;\n  border-right: 1px solid var(--gbq-line);\n  border-bottom: 0;\n  font-size: 14px;\n  white-space: nowrap;\n}\nbody.gbq-category :is(#ItemProfileModule, #SubmissionsListAdvancedListSettingsModule).gbq-category-panel > .Content {\n  display: flex;\n  flex: 1;\n  flex-wrap: wrap;\n  align-items: center;\n  min-width: 0;\n  padding: 10px 14px;\n  gap: 8px 12px;\n}\nbody.gbq-category :is(#ItemProfileModule, #SubmissionsListAdvancedListSettingsModule).gbq-category-panel > .Content > * {\n  margin: 0;\n}\nbody.gbq-category #SubmissionsListAdvancedListSettingsModule {\n  order: -1;\n  border-radius: 0 0 4px 4px;\n  font-size: 12px;\n}\nbody.gbq-category #SubmissionsListAdvancedListSettingsModule :is(select, input[type=text], input[type=search], input[type=number]) {\n  box-sizing: border-box;\n  border: 1px solid var(--gbq-line);\n  border-radius: 4px;\n  background: #121c22;\n  color: var(--gbq-heading);\n  font: inherit;\n}\nbody.gbq-category #SubmissionsListAdvancedListSettingsModule :is(select, input[type=text], input[type=search], input[type=number]):focus-visible {\n  outline: 1px solid var(--gbq-accent);\n}\nbody.gbq-category #ItemProfileModule {\n  order: -2;\n  border-bottom: 0;\n  border-radius: 4px 4px 0 0;\n  font-size: 14px;\n}\nbody.gbq-category #ItemProfileModule dl {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  margin: 0;\n  padding: 0;\n  gap: 8px;\n}\nbody.gbq-category #ItemProfileModule dt,\nbody.gbq-category #ItemProfileModule dd {\n  margin: 0;\n  padding: 0;\n}\nbody.gbq-category #ItemProfileModule dt {\n  color: var(--gbq-muted);\n}\nbody.gbq-category #ItemProfileModule dd {\n  margin-right: 12px;\n}\nbody.gbq-category #ItemProfileModule img {\n  width: 20px;\n  height: 20px;\n  object-fit: contain;\n}\nbody.gbq-category #SubcategoriesListModule {\n  margin-top: 12px;\n}\nbody.gbq-category #SubcategoriesListModule[hidden] {\n  display: none;\n}\nbody.gbq-category #SubcategoriesListModule .RecordsGrid {\n  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));\n}\nbody.gbq-category #SubmissionsListModule .RecordsGrid {\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 20px;\n}\nbody.gbq-category #SubmissionsListModule .PreviewImage {\n  display: block;\n  width: 100%;\n  height: auto;\n}\n\nbody.gbq-detail #ContentGrid > row.gbq-profile {\n  display: flex;\n  flex-direction: column;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > column {\n  flex-basis: auto;\n  box-sizing: border-box;\n  width: 100%;\n  max-width: 100%;\n  padding: 0;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-author {\n  display: grid;\n  grid-template-columns: max-content max-content minmax(0, 1fr);\n  grid-template-areas: \"category category category\" \"counts dates identity\";\n  align-items: stretch;\n  order: -2;\n  padding: 0;\n  border: 1px solid var(--gbq-line);\n  gap: 1px;\n  background: var(--gbq-line);\n  font-size: 12px;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-author > module,\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-author > modulegroup {\n  display: none !important;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-author > .gbq-meta {\n  grid-area: category;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-author > .gbq-counts {\n  grid-area: counts;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-author > .gbq-dates {\n  grid-area: dates;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-author > .gbq-identity {\n  grid-area: identity;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related {\n  display: flex;\n  align-items: flex-start;\n  order: -1;\n  padding: 12px 20px;\n  gap: 20px;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related > module {\n  flex: var(--gbq-card-count, 1) 1 calc((var(--gbq-card-count, 1) - 1) * 10px);\n  min-width: 0;\n  padding: 0;\n  border: 0;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related > modulegroup {\n  display: contents;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related > #MoreInCategorySubmissionsListModule {\n  order: 1;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related > #WipsBySubmitterSubmissionsListModule {\n  order: 2;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related h2 {\n  margin: 0 0 8px;\n  overflow: hidden;\n  font-size: 14px;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related .Content {\n  margin: 0;\n  padding: 0;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related .RecordsGrid {\n  grid-template-columns: none;\n  grid-auto-flow: column;\n  grid-auto-columns: minmax(0, 1fr);\n  gap: 10px;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related .Record {\n  min-width: 0;\n  content-visibility: visible;\n  contain-intrinsic-size: none;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related .Record .Identifiers {\n  flex-wrap: nowrap;\n  min-width: 0;\n  align-items: flex-start;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related .Record .Name {\n  display: -webkit-box;\n  -webkit-box-orient: vertical;\n  -webkit-line-clamp: 2;\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  font-size: 12px;\n  line-height: 1.4;\n  overflow-wrap: anywhere;\n  white-space: normal;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related .Record > .Stats,\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related .Record > .ContentRating {\n  display: none;\n}\nbody.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related .PreviewImage {\n  width: 100%;\n  height: auto;\n}\nbody.gbq-detail .gbq-source,\nbody.gbq-detail #LicenseModule,\nbody.gbq-detail #ShareButtonsModule,\nbody.gbq-detail #EmbeddablesModule {\n  display: none !important;\n}\nbody.gbq-detail .gbq-intro,\nbody.gbq-detail .gbq-body {\n  display: grid;\n  align-items: stretch;\n  margin-bottom: 16px;\n  gap: 12px;\n}\nbody.gbq-detail .gbq-intro {\n  grid-template-columns: minmax(0, 3fr) minmax(0, 4fr) minmax(0, 3fr);\n}\nbody.gbq-detail .gbq-body {\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n}\nbody.gbq-detail .gbq-panel-body {\n  display: flex;\n  flex-direction: column;\n  min-width: 0;\n  padding: 14px;\n  gap: 16px;\n}\nbody.gbq-detail .gbq-panel-body > module.gbq-panel-module {\n  box-sizing: border-box;\n  width: 100%;\n  min-width: 0;\n  margin: 0;\n  padding: 0;\n  border: 0;\n  background: none;\n}\nbody.gbq-detail .gbq-panel-body > module.gbq-panel-module > h2 {\n  display: none;\n}\nbody.gbq-detail .gbq-panel-body > module.gbq-panel-module > .Content {\n  margin: 0;\n  padding: 0;\n}\nbody.gbq-detail .gbq-media-panel :is(iframe, video) {\n  display: block;\n  box-sizing: border-box;\n  width: 100%;\n  max-width: 100%;\n  height: auto;\n}\nbody.gbq-detail .gbq-media-panel iframe {\n  aspect-ratio: 16/9;\n}\nbody.gbq-detail .gbq-files-panel .gbq-file-date {\n  display: block;\n  color: var(--gbq-accent);\n}\nbody.gbq-detail .gbq-meta {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: stretch;\n  gap: 1px;\n  background: var(--gbq-line);\n  font-size: 14px;\n}\nbody.gbq-detail .gbq-meta .gbq-field-label {\n  font-size: inherit;\n}\nbody.gbq-detail .gbq-meta button {\n  font-size: 10.8px;\n}\nbody.gbq-detail .gbq-field {\n  display: flex;\n  flex: 1 1 auto;\n  align-items: center;\n  justify-content: center;\n  box-sizing: border-box;\n  min-height: 44px;\n  padding: 8px 12px;\n  gap: 8px;\n  background: var(--gbq-cell-bg);\n}\nbody.gbq-detail .gbq-field-label {\n  color: var(--gbq-muted);\n  font-size: 11px;\n  white-space: nowrap;\n}\nbody.gbq-detail .gbq-inline,\nbody.gbq-detail .gbq-component {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 8px;\n  min-width: 0;\n}\nbody.gbq-detail .gbq-inline img {\n  width: 20px;\n  height: 20px;\n  object-fit: contain;\n}\nbody.gbq-detail .gbq-counts,\nbody.gbq-detail .gbq-dates,\nbody.gbq-detail .gbq-identity {\n  box-sizing: border-box;\n  min-width: 0;\n  padding: 10px 12px;\n  background: var(--gbq-cell-bg);\n}\nbody.gbq-detail .gbq-counts {\n  display: grid;\n  align-content: center;\n  gap: 5px;\n}\nbody.gbq-detail .gbq-count-top {\n  display: grid;\n  grid-template-columns: repeat(3, 72px);\n  margin: 0;\n  padding: 0;\n  gap: 6px;\n}\nbody.gbq-detail .gbq-count-bottom {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n}\nbody.gbq-detail .gbq-comments {\n  width: 72px;\n  margin: 0;\n  padding: 0;\n}\nbody.gbq-detail .gbq-stat {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  box-sizing: border-box;\n  width: 72px;\n  height: 26px;\n  margin: 0;\n  padding: 2px;\n  border-radius: 2px;\n  gap: 3px;\n  background: rgba(0, 0, 0, 0.18);\n  list-style: none;\n  font: 700 18px/20px ui-monospace, Consolas, monospace;\n  font-variant-numeric: tabular-nums;\n  white-space: nowrap;\n}\nbody.gbq-detail .gbq-stat itemCount,\nbody.gbq-detail .gbq-stat time,\nbody.gbq-detail .gbq-stat .TimeStamp {\n  font: inherit;\n}\nbody.gbq-detail .gbq-stat .TimeStamp {\n  display: inline-flex;\n  align-items: center;\n  gap: 3px;\n}\nbody.gbq-detail .gbq-dates {\n  display: grid;\n  align-content: center;\n  gap: 3px;\n}\nbody.gbq-detail .gbq-date-row {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n}\nbody.gbq-detail .gbq-date-absolute,\nbody.gbq-detail .gbq-files-panel .gbq-file-date {\n  font: 14px/22px ui-monospace, Consolas, monospace;\n  font-variant-numeric: tabular-nums;\n  white-space: nowrap;\n}\nbody.gbq-detail .gbq-identity {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  align-content: center;\n  justify-content: flex-start;\n  gap: 8px;\n}\nbody.gbq-detail .gbq-identity .gbq-component-SubmitterModule {\n  margin-right: 12px;\n}\nbody.gbq-detail .gbq-identity .Avatar {\n  width: 40px;\n  height: 40px;\n}\nbody.gbq-detail .gbq-identity form {\n  margin: 0;\n  padding: 0;\n}\nbody.gbq-detail .gbq-identity .gbq-component-AuthorsAndRolesModule {\n  flex-basis: 100%;\n  justify-content: flex-start;\n}\nbody.gbq-detail .gbq-identity dl {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  margin: 0;\n  padding: 0;\n  gap: 4px 8px;\n}\nbody.gbq-detail .gbq-identity dt,\nbody.gbq-detail .gbq-identity dd {\n  margin: 0;\n  padding: 0;\n}\nbody.gbq-detail .gbq-identity .AuthorsGroup {\n  font-size: 11px;\n}\nbody.gbq-detail .gbq-identity .Upic {\n  max-height: 20px;\n  width: auto;\n}\nbody.gbq-detail #ContentRatingsModule {\n  padding-block: 10px;\n  font-size: 12px;\n}\nbody.gbq-detail #ContentRatingsModule h2 {\n  font-size: 14px;\n}\nbody.gbq-detail .gbq-detail-open {\n  margin-bottom: 8px;\n}\nbody.gbq-detail .gbq-gallery .Gallery {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: center;\n}\nbody.gbq-detail .gbq-gallery .Gallery a.PrimaryPreview {\n  display: flex;\n  float: none;\n  justify-content: center;\n  width: 100%;\n}\nbody.gbq-detail .gbq-gallery .Gallery a.PrimaryPreview img {\n  width: auto;\n  max-width: 100%;\n  height: auto;\n  max-height: 55vh;\n  object-fit: contain;\n}\n\nhtml.gbq-viewer-open {\n  overflow: hidden;\n}\n\n.gbq-viewer {\n  position: fixed;\n  inset: 0;\n  z-index: 2147483646;\n  display: grid;\n  grid-template-rows: auto minmax(0, 1fr) clamp(110px, 22vh, 240px);\n  box-sizing: border-box;\n  padding: 20px;\n  gap: 12px;\n  background: rgba(5, 10, 14, 0.94);\n  color: #eee;\n  font: 14px/1.4 \"Open Sans\", sans-serif;\n}\n.gbq-viewer [hidden] {\n  display: none !important;\n}\n.gbq-viewer button {\n  padding: 6px 12px;\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  border-radius: 4px;\n  background: #24323d;\n  color: #eee;\n  font: inherit;\n  cursor: pointer;\n}\n.gbq-viewer button:hover, .gbq-viewer button:focus-visible {\n  border-color: var(--gbq-accent);\n}\n\n.gbq-viewer-header {\n  display: flex;\n  align-items: center;\n  min-width: 0;\n  gap: 16px;\n}\n\n.gbq-viewer-title {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  font-weight: bold;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.gbq-viewer-status {\n  color: #b9c6cf;\n  font-size: 12px;\n}\n\n.gbq-viewer-stage {\n  display: grid;\n  grid-template-columns: 40px minmax(0, 1fr) 40px;\n  align-items: center;\n  min-height: 0;\n  gap: 12px;\n}\n.gbq-viewer-stage > img {\n  grid-column: 2;\n  width: 100%;\n  height: 100%;\n  min-height: 0;\n  object-fit: contain;\n}\n.gbq-viewer-stage > button {\n  display: grid;\n  place-items: center;\n  box-sizing: border-box;\n  width: 40px;\n  height: 48px;\n  padding: 0;\n  font-size: 32px;\n  line-height: 1;\n  text-align: center;\n}\n.gbq-viewer-stage > button:last-child {\n  grid-column: 3;\n}\n\n.gbq-viewer-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));\n  grid-auto-rows: min-content;\n  align-content: start;\n  justify-self: center;\n  box-sizing: border-box;\n  width: 100%;\n  max-width: 1440px;\n  padding: 8px;\n  overflow-y: auto;\n  overscroll-behavior: contain;\n  gap: 8px;\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 6px;\n}\n.gbq-viewer-grid .gbq-thumbnail {\n  min-width: 0;\n  padding: 3px;\n  border: 2px solid transparent;\n  background: #15212b;\n}\n.gbq-viewer-grid .gbq-thumbnail[aria-current=true] {\n  border-color: var(--gbq-accent);\n}\n.gbq-viewer-grid .gbq-thumbnail img {\n  display: block;\n  width: 100%;\n  height: 64px;\n  object-fit: contain;\n}\n\n@media (max-width: 800px) {\n  body.gbq-detail :is(.gbq-intro, .gbq-body) {\n    grid-template-columns: minmax(0, 1fr);\n  }\n  body.gbq-category #SubmissionsListModule .RecordsGrid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n  body.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related {\n    flex-direction: column;\n  }\n  body.gbq-detail #ContentGrid > row.gbq-profile > .gbq-related > module {\n    flex: none;\n    width: 100%;\n  }\n  .gbq-viewer {\n    padding: 10px;\n  }\n  .gbq-viewer-header {\n    flex-wrap: wrap;\n    gap: 8px;\n  }\n}\n@media (max-width: 1100px) {\n  body.gbq-detail #ContentGrid > row.gbq-profile > .gbq-author {\n    grid-template-columns: max-content minmax(0, 1fr);\n    grid-template-areas: \"category category\" \"counts dates\" \"identity identity\";\n  }\n}\n@media (max-width: 500px) {\n  body.gbq-category #SubmissionsListModule .RecordsGrid {\n    grid-template-columns: minmax(0, 1fr);\n  }\n  body.gbq #PageTitle {\n    font-size: 22px !important;\n  }\n}";
	var detailId = location.pathname.match(/^\/mods\/(\d+)\/?$/)?.[1];
	var isCategory = /^\/mods\/cats\/\d+\/?$/.test(location.pathname);
	if (detailId || isCategory) main();
	function main() {
		_GM_addStyle(style_default);
		document.body.classList.add("gbq", detailId ? "gbq-detail" : "gbq-category");
		let scheduled = false;
		new MutationObserver(() => {
			if (scheduled) return;
			scheduled = true;
			requestAnimationFrame(() => {
				scheduled = false;
				refreshPage();
			});
		}).observe(document.getElementById("MainContentWrapper") ?? document.body, {
			childList: true,
			subtree: true
		});
		refreshPage();
		document.addEventListener("click", handleGalleryClick);
		document.addEventListener("keydown", handleKeyboard, true);
	}
	function refreshPage() {
		const grid = document.getElementById("ContentGrid");
		if (!grid) return;
		if (isCategory) arrangeCategoryPage(grid);
		else if (detailId) {
			arrangeDetailPage(grid, detailId);
			refreshDetailGallery(grid, detailId);
		}
		for (const wrapper of grid.querySelectorAll(".Record .PreviewWrapper")) {
			const preview = wrapper.querySelector("img.PreviewImage");
			if (preview && isCategory && preview.src.includes("_220.webp") && !preview.dataset.gbqHires) {
				const original = preview.src;
				preview.dataset.gbqHires = "true";
				preview.addEventListener("error", () => {
					preview.src = original;
				}, { once: true });
				preview.src = original.replace("_220.webp", "_530.webp");
			}
			if (wrapper.querySelector(".gbq-open")) continue;
			const link = wrapper.querySelector("a.Preview[href]");
			const id = link && new URL(link.href).pathname.match(/^\/mods\/(\d+)\/?$/)?.[1];
			if (!id) continue;
			const button = createButton("Gallery", "gbq-open");
			button.dataset.modId = id;
			button.dataset.modName = link.querySelector("img")?.alt ?? "Gallery";
			button.title = "View all images";
			wrapper.append(button);
		}
	}
})();
