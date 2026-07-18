// ==UserScript==
// @name         booth.pm: Grid Image Viewer
// @namespace    https://github.com/Elypha/userscripts
// @version      1.4.0
// @author       Elypha
// @description  View all preview images in an overlay with a main viewer and a thumbnail grid.
// @license      Apache-2.0
// @homepageURL  https://github.com/Elypha/userscripts
// @supportURL   https://github.com/Elypha/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/booth.pm-GridImageViewer.user.js
// @updateURL    https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/booth.pm-GridImageViewer.meta.js
// @match        https://booth.pm/*/items/*
// @match        https://*.booth.pm/items/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
	"use strict";
	var _GM_addStyle = (() => typeof GM_addStyle != "undefined" ? GM_addStyle : void 0)();
	var style_default = ".elypha-booth-image-viewer-overlay {\n  position: fixed;\n  top: 0;\n  left: 0;\n  z-index: 9999;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  box-sizing: border-box;\n  width: 100%;\n  height: 100%;\n  padding: 20px;\n  background: rgba(0, 0, 0, 0.8);\n}\n\n.elypha-booth-image-viewer-main-view {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 80%;\n  height: 70%;\n  margin-bottom: 15px;\n}\n.elypha-booth-image-viewer-main-view img {\n  max-width: 100%;\n  max-height: 100%;\n  object-fit: contain;\n}\n\n.elypha-booth-image-viewer-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));\n  gap: 10px;\n  width: 85%;\n  height: 25%;\n  padding: 10px;\n  overflow-y: auto;\n  background: #333;\n  border-radius: 5px;\n}\n.elypha-booth-image-viewer-grid img {\n  width: 100%;\n  height: auto;\n  cursor: pointer;\n  border: 2px solid transparent;\n  transition: border-color 0.3s;\n}\n.elypha-booth-image-viewer-grid img:hover, .elypha-booth-image-viewer-grid img.elypha-booth-image-viewer-selected {\n  border-color: #0af;\n}\n.elypha-booth-image-viewer-grid::-webkit-scrollbar {\n  width: 8px;\n}\n.elypha-booth-image-viewer-grid::-webkit-scrollbar-track {\n  background: #555;\n  border-radius: 4px;\n}\n.elypha-booth-image-viewer-grid::-webkit-scrollbar-thumb {\n  background: #888;\n  border-radius: 4px;\n}\n.elypha-booth-image-viewer-grid::-webkit-scrollbar-thumb:hover {\n  background: #aaa;\n}\n\n.elypha-booth-image-viewer-close-button {\n  position: absolute;\n  top: 20px;\n  right: 30px;\n  padding: 0;\n  color: #fff;\n  font-size: 30px;\n  cursor: pointer;\n  background: none;\n  border: 0;\n}\n\n.elypha-booth-image-viewer-open-button {\n  position: fixed;\n  right: 20px;\n  bottom: 20px;\n  z-index: 9998;\n  padding: 10px 20px;\n  color: #fff;\n  font-size: 16px;\n  cursor: pointer;\n  background-color: #007bff;\n  border: 0;\n  border-radius: 5px;\n}";
	var overlayClass = "elypha-booth-image-viewer-overlay";
	var mainViewClass = "elypha-booth-image-viewer-main-view";
	var gridClass = "elypha-booth-image-viewer-grid";
	var closeButtonClass = "elypha-booth-image-viewer-close-button";
	var openButtonClass = "elypha-booth-image-viewer-open-button";
	var selectedClass = "elypha-booth-image-viewer-selected";
	function main() {
		_GM_addStyle(style_default);
		const viewButton = document.createElement("button");
		viewButton.type = "button";
		viewButton.textContent = "View Images";
		viewButton.className = openButtonClass;
		viewButton.addEventListener("click", openImageViewer);
		document.body.appendChild(viewButton);
		registerKeyboardNavigation();
	}
	main();
	function openImageViewer() {
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
			if (event.target === overlay) closeImageViewer(overlay);
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
			if (index === 0) thumbnail.classList.add(selectedClass);
			thumbnail.addEventListener("click", () => {
				mainImage.src = url;
				grid.querySelector(`.${selectedClass}`)?.classList.remove(selectedClass);
				thumbnail.classList.add(selectedClass);
			});
			grid.appendChild(thumbnail);
		});
		document.body.appendChild(overlay);
	}
	function getImageUrls() {
		const slides = document.querySelectorAll("div.primary-image-area div.slick-track div.slick-slide[data-slick-index]");
		return Array.from(slides).filter((slide) => !slide.classList.contains("slick-cloned")).map((slide) => {
			const image = slide.querySelector("img");
			return image?.dataset.lazy || image?.src;
		}).filter((url) => Boolean(url));
	}
	function closeImageViewer(overlay) {
		overlay.remove();
	}
	function registerKeyboardNavigation() {
		document.addEventListener("keydown", (event) => {
			const key = event.key.toLowerCase();
			const overlay = document.querySelector(`.${overlayClass}`);
			if (key === "tab") {
				event.preventDefault();
				if (overlay instanceof HTMLElement) closeImageViewer(overlay);
				else openImageViewer();
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
	function navigateImages(overlay, direction) {
		const thumbnails = overlay.querySelectorAll(`.${gridClass} img`);
		if (thumbnails.length <= 1) return;
		const targetThumbnail = thumbnails[(getSelectedIndex(overlay) + direction + thumbnails.length) % thumbnails.length];
		if (!targetThumbnail) return;
		targetThumbnail.click();
		targetThumbnail.scrollIntoView({
			behavior: "smooth",
			block: "nearest"
		});
	}
	function getSelectedIndex(overlay) {
		const selected = overlay.querySelector(`.${gridClass} img.${selectedClass}`);
		const index = Number(selected?.dataset.index);
		return Number.isInteger(index) ? index : 0;
	}
})();
