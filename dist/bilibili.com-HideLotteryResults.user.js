// ==UserScript==
// @name         bilibili.com: Hide Lottery Results
// @namespace    https://github.com/Elypha/userscripts
// @version      1.0.0
// @author       Elypha
// @description  Replace lottery result posts in Bilibili space timelines with a compact placeholder.
// @license      Apache-2.0
// @icon         https://www.bilibili.com/favicon.ico
// @homepageURL  https://github.com/Elypha/userscripts
// @supportURL   https://github.com/Elypha/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/bilibili.com-HideLotteryResults.user.js
// @updateURL    https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/bilibili.com-HideLotteryResults.meta.js
// @match        https://space.bilibili.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
	"use strict";
	var listSelector = ".bili-dyn-list";
	var itemSelector = ".bili-dyn-list__item";
	var descriptionSelector = ".bili-dyn-content__forw__desc .bili-rich-text__content";
	var mentionSelector = "span.at[data-type=\"at\"]";
	var bodySelector = ".bili-dyn-item__body";
	var currentList = null;
	var listObserver = new MutationObserver(processListMutations);
	var pageObserver = new MutationObserver(syncListIfDisconnected);
	function main() {
		pageObserver.observe(document.body, {
			childList: true,
			subtree: true
		});
		syncList();
	}
	main();
	function syncListIfDisconnected() {
		if (!currentList?.isConnected) syncList();
	}
	function syncList() {
		const nextList = document.querySelector(listSelector);
		if (nextList === currentList) return;
		listObserver.disconnect();
		currentList = nextList;
		if (!currentList) return;
		currentList.querySelectorAll(itemSelector).forEach(hideLotteryResult);
		listObserver.observe(currentList, {
			childList: true,
			subtree: true,
			characterData: true
		});
	}
	function processListMutations(mutations) {
		const changedItems = new Set();
		for (const mutation of mutations) {
			const containingItem = (mutation.target instanceof Element ? mutation.target : mutation.target.parentElement)?.closest(itemSelector);
			if (containingItem && currentList?.contains(containingItem)) {
				changedItems.add(containingItem);
				continue;
			}
			mutation.addedNodes.forEach((node) => addItemsFromNode(node, changedItems));
		}
		changedItems.forEach(hideLotteryResult);
	}
	function addItemsFromNode(node, items) {
		const element = node instanceof Element ? node : node.parentElement;
		if (!element || !currentList?.contains(element)) return;
		const containingItem = element.closest(itemSelector);
		if (containingItem) {
			items.add(containingItem);
			return;
		}
		element.querySelectorAll(itemSelector).forEach((item) => items.add(item));
	}
	function hideLotteryResult(item) {
		const description = item.querySelector(descriptionSelector);
		if (!description || !/恭喜[\s\S]*中奖/.test(description.textContent ?? "")) return;
		if (description.querySelectorAll(mentionSelector).length < 2) return;
		const body = item.querySelector(bodySelector);
		if (!body) return;
		const placeholder = document.createElement("span");
		placeholder.textContent = "< Lottery Removed >";
		placeholder.style.cssText = "color: #999; display: block; font-size: 0.9em;";
		body.replaceChildren(placeholder);
	}
})();
