// ==UserScript==
// @name         Image Actions
// @namespace    https://github.com/Elypha/userscripts
// @version      1.3.1
// @author       Elypha
// @description  Open or copy the image under the mouse after a flowmouse:gesture event.
// @license      Apache-2.0
// @homepageURL  https://github.com/Elypha/userscripts
// @supportURL   https://github.com/Elypha/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/ImageActions.user.js
// @updateURL    https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/ImageActions.meta.js
// @match        http://*/*
// @match        https://*/*
// @connect      *
// @grant        GM.openInTab
// @grant        GM.xmlHttpRequest
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
	"use strict";
	var _GM = (() => typeof GM != "undefined" ? GM : void 0)();
	var _GM_addStyle = (() => typeof GM_addStyle != "undefined" ? GM_addStyle : void 0)();
	async function copyImageToClipboard(url) {
		const pngBlob = fetchImage(url).then(convertToPng);
		await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
	}
	async function fetchImage(url) {
		const response = await _GM.xmlHttpRequest({
			method: "GET",
			url,
			responseType: "blob",
			anonymous: true
		});
		if (response.status < 200 || response.status >= 300 || !(response.response instanceof Blob)) throw new Error(`Image request failed with status ${response.status}.`);
		return response.response;
	}
	async function convertToPng(imageBlob) {
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
		const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
		if (!pngBlob) throw new Error("Unable to convert the image to PNG.");
		return pngBlob;
	}
	var backgroundImageUrlPattern = /url\(\s*(['"]?)(.*?)\1\s*\)/;
	function findImageUrlAt(point) {
		const elements = document.elementsFromPoint(point.x, point.y);
		return findHtmlImageUrlAt(elements, point) ?? findBackgroundImageUrlAt(elements);
	}
	function findHtmlImageUrlAt(elements, point) {
		const inspectedImages = new Set();
		for (const element of elements) for (const image of imageCandidates(element, point)) {
			if (inspectedImages.has(image)) continue;
			inspectedImages.add(image);
			const url = getImageUrl(image);
			if (url) return url;
		}
	}
	function imageCandidates(element, point) {
		const candidates = [];
		if (element instanceof HTMLImageElement) candidates.push(element);
		const closestImage = element.closest("img");
		if (closestImage instanceof HTMLImageElement) candidates.push(closestImage);
		candidates.push(...element.querySelectorAll("img"));
		return candidates.filter((image) => isInsideImage(image, point));
	}
	function isInsideImage(image, point) {
		const bounds = image.getBoundingClientRect();
		return point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom;
	}
	function getImageUrl(image) {
		const url = image.currentSrc || image.src;
		return url && url !== "about:blank" ? url : void 0;
	}
	function findBackgroundImageUrlAt(elements) {
		for (const element of elements) {
			const url = findBackgroundImageUrl(element);
			if (url) return url;
		}
	}
	function findBackgroundImageUrl(element) {
		for (let candidate = element; candidate && candidate !== document.body; candidate = candidate.parentElement) {
			const url = getBackgroundImageUrl(candidate);
			if (url) return url;
		}
	}
	function getBackgroundImageUrl(element) {
		const backgroundImage = getComputedStyle(element).backgroundImage;
		const match = backgroundImageUrlPattern.exec(backgroundImage);
		if (!match?.[2]) return void 0;
		try {
			return new URL(match[2], document.baseURI).href;
		} catch {
			return;
		}
	}
	var style_default = ".elypha-image-actions-menu {\n  position: fixed;\n  z-index: 2147483647;\n  display: grid;\n  width: 184px;\n  padding: 4px;\n  font-family: system-ui, sans-serif;\n  background: #242424;\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  border-radius: 8px;\n  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);\n}\n.elypha-image-actions-menu button {\n  padding: 8px 10px;\n  color: #f5f5f5;\n  font: inherit;\n  font-size: 13px;\n  text-align: left;\n  cursor: pointer;\n  background: transparent;\n  border: 0;\n  border-radius: 5px;\n}\n.elypha-image-actions-menu button:hover:not(:disabled) {\n  background: rgba(255, 255, 255, 0.12);\n}\n.elypha-image-actions-menu button:disabled {\n  color: #999;\n  cursor: wait;\n}\n\n.elypha-image-actions-toast {\n  position: fixed;\n  right: 16px;\n  bottom: 16px;\n  z-index: 2147483647;\n  max-width: min(360px, 100vw - 32px);\n  padding: 10px 13px;\n  color: #f5f5f5;\n  font: 14px/1.35 system-ui, sans-serif;\n  background: #242424;\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  border-radius: 7px;\n  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);\n}";
	var menuClass = "elypha-image-actions-menu";
	var toastClass = "elypha-image-actions-toast";
	var ignoredSelector = `.${menuClass}, .${toastClass}`;
	var gestureEventType = "flowmouse:gesture";
	var gestureTarget = "image-actions";
	var ImageActionsController = class {
		lastPointerPosition;
		activeMenu;
		activeToast;
		start() {
			_GM_addStyle(style_default);
			document.addEventListener("pointermove", (event) => this.rememberPointer(event), {
				capture: true,
				passive: true
			});
			document.addEventListener("pointerdown", (event) => this.rememberPointer(event), {
				capture: true,
				passive: true
			});
			document.addEventListener("click", (event) => {
				if (!this.isIgnoredTarget(event.target)) this.removeMenu();
			}, { capture: true });
			document.addEventListener("keydown", (event) => {
				if (event.key === "Escape") this.removeMenu();
			});
			window.addEventListener(gestureEventType, (event) => this.onGesture(event));
		}
		rememberPointer(event) {
			if (this.isIgnoredTarget(event.target)) return;
			this.lastPointerPosition = {
				x: event.clientX,
				y: event.clientY
			};
		}
		isIgnoredTarget(target) {
			return target instanceof Element && Boolean(target.closest(ignoredSelector));
		}
		onGesture(event) {
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
		isImageActionsGesture(event) {
			const detail = event.detail;
			return typeof detail === "object" && detail !== null && detail.target === gestureTarget;
		}
		showMenu(point, imageUrl) {
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
		makeMenuButton(label, onClick) {
			const button = document.createElement("button");
			button.type = "button";
			button.textContent = label;
			button.addEventListener("click", (event) => {
				event.stopPropagation();
				onClick();
			});
			return button;
		}
		removeMenu() {
			this.activeMenu?.remove();
			this.activeMenu = void 0;
		}
		openImage(url) {
			_GM.openInTab(url, {
				active: true,
				insert: true,
				setParent: true
			});
			this.removeMenu();
		}
		async copyImage(url, button) {
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
		showToast(message) {
			this.activeToast?.remove();
			const toast = document.createElement("div");
			toast.className = toastClass;
			toast.textContent = message;
			document.body.appendChild(toast);
			this.activeToast = toast;
			window.setTimeout(() => {
				if (this.activeToast === toast) {
					toast.remove();
					this.activeToast = void 0;
				}
			}, 2400);
		}
	};
	new ImageActionsController().start();
})();
