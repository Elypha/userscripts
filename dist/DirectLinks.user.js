// ==UserScript==
// @name         Direct Links
// @namespace    https://github.com/Elypha/userscripts
// @version      1.0.0
// @author       Elypha
// @description  Unwrap redirect links on Biligame, Pixiv, and GameBanana.
// @license      Apache-2.0
// @homepageURL  https://github.com/Elypha/userscripts
// @supportURL   https://github.com/Elypha/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/DirectLinks.user.js
// @updateURL    https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/DirectLinks.meta.js
// @match        https://wiki.biligame.com/*
// @match        https://www.pixiv.net/*
// @match        https://gamebanana.com/*
// @match        https://www.gamebanana.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
	"use strict";
	function getDirectUrl(pageHostname, linkUrl) {
		switch (pageHostname) {
			case "wiki.biligame.com": return unwrapBiliGame(linkUrl);
			case "www.pixiv.net": return unwrapPixiv(linkUrl);
			case "gamebanana.com":
			case "www.gamebanana.com": return unwrapGameBanana(linkUrl);
			default: return;
		}
	}
	function unwrapBiliGame(linkUrl) {
		if (linkUrl.hostname !== "game.bilibili.com" || linkUrl.pathname !== "/linkfilter/") return void 0;
		const target = linkUrl.searchParams.get("url");
		return target ? parseHttpUrl(target) : void 0;
	}
	function unwrapPixiv(linkUrl) {
		if (linkUrl.hostname !== "www.pixiv.net" || linkUrl.pathname !== "/jump.php") return void 0;
		const parameterTarget = linkUrl.searchParams.get("url");
		if (parameterTarget) return parseHttpUrl(parameterTarget);
		try {
			const target = decodeURIComponent(linkUrl.search.slice(1));
			return target ? parseHttpUrl(target) : void 0;
		} catch {
			return;
		}
	}
	function unwrapGameBanana(linkUrl) {
		if (!(linkUrl.hostname === "gamebanana.com" || linkUrl.hostname === "www.gamebanana.com") || linkUrl.pathname !== "/linkfilter") return void 0;
		const target = linkUrl.searchParams.get("url");
		return target ? parseHttpUrl(target) : void 0;
	}
	function parseHttpUrl(value) {
		try {
			const url = new URL(value);
			return url.protocol === "http:" || url.protocol === "https:" ? url : void 0;
		} catch {
			return;
		}
	}
	var linkSelectors = {
		"wiki.biligame.com": "a[href*=\"game.bilibili.com/linkfilter/\"]",
		"www.pixiv.net": "a[href*=\"/jump.php?\"]",
		"gamebanana.com": "a[href*=\"/linkfilter?\"]",
		"www.gamebanana.com": "a[href*=\"/linkfilter?\"]"
	};
	function main() {
		const linkSelector = linkSelectors[window.location.hostname];
		if (!linkSelector) return;
		cleanLinks(document, linkSelector);
		observeLinks(linkSelector);
	}
	main();
	function cleanLinks(root, linkSelector) {
		if (root instanceof HTMLAnchorElement && root.matches(linkSelector)) cleanLink(root);
		root.querySelectorAll(linkSelector).forEach(cleanLink);
	}
	function cleanLink(link) {
		try {
			const directUrl = getDirectUrl(window.location.hostname, new URL(link.href));
			if (directUrl) link.href = directUrl.href;
		} catch {}
	}
	function observeLinks(linkSelector) {
		new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === "attributes" && mutation.target instanceof HTMLAnchorElement && mutation.target.matches(linkSelector)) cleanLink(mutation.target);
				for (const node of mutation.addedNodes) if (node instanceof Element) cleanLinks(node, linkSelector);
			}
		}).observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["href"],
			childList: true,
			subtree: true
		});
	}
})();
