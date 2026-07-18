// ==UserScript==
// @name         google.com: Quick Language Filter
// @namespace    https://github.com/Elypha/userscripts
// @version      1.1.0
// @author       Elypha
// @description  Add quick language filter buttons to Google search results.
// @license      Apache-2.0
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @homepageURL  https://github.com/Elypha/userscripts
// @supportURL   https://github.com/Elypha/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/google.com-QuickLanguageFilter.user.js
// @updateURL    https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/google.com-QuickLanguageFilter.meta.js
// @match        https://www.google.com/search?q=*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
	"use strict";
	function waitForElement(selector, root = document) {
		const existingElement = root.querySelector(selector);
		if (existingElement) return Promise.resolve(existingElement);
		return new Promise((resolve) => {
			const observer = new MutationObserver(() => {
				const element = root.querySelector(selector);
				if (!element) return;
				observer.disconnect();
				resolve(element);
			});
			const observationRoot = root instanceof Document ? root.documentElement : root;
			observer.observe(observationRoot, {
				childList: true,
				subtree: true
			});
		});
	}
	var style_default = ".elypha-language-filter {\n  display: flex;\n  flex-direction: row;\n  flex: none;\n  align-items: center;\n  height: 45px;\n  margin-left: auto;\n}\n.elypha-language-filter button {\n  height: 30px;\n  padding: 0 9px;\n  color: #fff;\n  cursor: pointer;\n  border: 1px solid #eee;\n  border-radius: 12px;\n}";
	var toolbarSelector = "#hdtb-tls";
	var filterContainerClass = "elypha-language-filter";
	var languageFilters = [
		{
			label: "文",
			colour: "hsl(0deg 100% 80%)",
			language: "lang_zh-CN",
			title: "简体中文"
		},
		{
			label: "書",
			colour: "hsl(0deg 100% 80%)",
			language: "lang_zh-TW",
			title: "繁體中文"
		},
		{
			label: "あ",
			colour: "hsl(220deg 100% 80%)",
			language: "lang_ja",
			title: "日本語"
		},
		{
			label: "A",
			colour: "hsl(240deg 100% 80%)",
			language: "lang_en",
			title: "English"
		}
	];
	async function main() {
		addLanguageFilter(await waitForElement(toolbarSelector));
	}
	main();
	function addLanguageFilter(toolbar) {
		if (document.querySelector(`.${filterContainerClass}`)) return;
		const style = document.createElement("style");
		style.textContent = style_default;
		document.head.appendChild(style);
		const container = document.createElement("div");
		container.className = filterContainerClass;
		container.append(...languageFilters.map(createFilterButton));
		toolbar.after(container);
	}
	function createFilterButton(filter) {
		const button = document.createElement("button");
		button.type = "button";
		button.textContent = filter.label;
		button.title = filter.title;
		button.style.backgroundColor = filter.colour;
		button.addEventListener("click", () => updateLanguageFilter(filter.language));
		return button;
	}
	function updateLanguageFilter(language) {
		const url = new URL(window.location.href);
		url.searchParams.set("lr", language);
		window.location.assign(url);
	}
})();
