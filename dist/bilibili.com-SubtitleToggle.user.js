// ==UserScript==
// @name         bilibili.com: Subtitle Toggle
// @namespace    https://github.com/Elypha/userscripts
// @version      1.0.0
// @author       Elypha
// @description  Remember the subtitle switch and toggle it with C on Bilibili video pages.
// @license      Apache-2.0
// @icon         https://www.bilibili.com/favicon.ico
// @homepageURL  https://github.com/Elypha/userscripts
// @supportURL   https://github.com/Elypha/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/bilibili.com-SubtitleToggle.user.js
// @updateURL    https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/bilibili.com-SubtitleToggle.meta.js
// @match        https://www.bilibili.com/video/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// @noframes
// ==/UserScript==

(function() {
	"use strict";
	var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
	var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
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
	var preferenceKey = "subtitleEnabled";
	var subtitleSelector = ".bpx-player-ctrl-subtitle";
	var closeSelector = ".bpx-player-ctrl-subtitle-close-switch";
	var languageSelector = ".bpx-player-ctrl-subtitle-language-item[data-lan]";
	var primaryLanguageSelector = `.bpx-player-ctrl-subtitle-major ${languageSelector}`;
	var activeClass = "bpx-state-active";
	var playerWrapper = null;
	var subtitleControl = null;
	var lastLanguage;
	var playerObserver = new MutationObserver(syncSubtitleControl);
	var subtitleObserver = new MutationObserver(restorePreference);
	main();
	async function main() {
		document.addEventListener("keydown", handleKeyboard, true);
		document.addEventListener("click", handleClick, true);
		document.addEventListener("loadstart", (event) => {
			if (!(event.target instanceof HTMLVideoElement)) return;
			const wrapper = document.querySelector("#playerWrap");
			if (wrapper) observePlayer(wrapper);
		}, true);
		observePlayer(await waitForElement("#playerWrap"));
	}
	function observePlayer(wrapper) {
		if (wrapper !== playerWrapper) {
			playerObserver.disconnect();
			playerWrapper = wrapper;
			playerObserver.observe(wrapper, {
				childList: true,
				subtree: true
			});
		}
		syncSubtitleControl();
	}
	function syncSubtitleControl() {
		if (subtitleControl?.isConnected && playerWrapper?.contains(subtitleControl)) return;
		subtitleObserver.disconnect();
		subtitleControl = playerWrapper?.querySelector(subtitleSelector) ?? null;
		if (!subtitleControl) return;
		subtitleObserver.observe(subtitleControl, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["class"]
		});
		restorePreference();
	}
	function getControls() {
		if (!subtitleControl?.isConnected) return null;
		const closeButton = subtitleControl.querySelector(closeSelector);
		const languages = Array.from(subtitleControl.querySelectorAll(primaryLanguageSelector));
		if (!closeButton || languages.length === 0) return null;
		const selectedLanguage = languages.find((language) => language.classList.contains(activeClass));
		const enabled = !closeButton.classList.contains(activeClass);
		if (enabled && !selectedLanguage) return null;
		if (selectedLanguage) lastLanguage = selectedLanguage.dataset.lan;
		return {
			closeButton,
			languageButton: selectedLanguage ?? languages.find((language) => language.dataset.lan === lastLanguage) ?? languages[0],
			enabled
		};
	}
	function restorePreference() {
		const controls = getControls();
		if (!controls) return;
		const enabled = _GM_getValue(preferenceKey, true);
		if (enabled === controls.enabled) return;
		(enabled ? controls.languageButton : controls.closeButton).click();
	}
	function handleKeyboard(event) {
		if (event.code !== "KeyC" || event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
		if (event.composedPath().some((target) => target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable))) return;
		const controls = getControls();
		if (!controls) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		_GM_setValue(preferenceKey, !controls.enabled);
		restorePreference();
	}
	function handleClick(event) {
		if (!event.isTrusted || !(event.target instanceof Element)) return;
		const button = event.target.closest(`${closeSelector}, ${languageSelector}`);
		if (!button || !subtitleControl?.contains(button) || !getControls()) return;
		_GM_setValue(preferenceKey, !button.matches(closeSelector));
	}
})();
