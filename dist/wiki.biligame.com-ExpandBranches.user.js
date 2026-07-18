// ==UserScript==
// @name         wiki.biligame.com: Expand Branches
// @namespace    https://github.com/Elypha/userscripts
// @version      1.0.0
// @author       Elypha
// @description  Expand plot and message branches on the Honkai: Star Rail BWIKI.
// @license      Apache-2.0
// @homepageURL  https://github.com/Elypha/userscripts
// @supportURL   https://github.com/Elypha/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/wiki.biligame.com-ExpandBranches.user.js
// @updateURL    https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/wiki.biligame.com-ExpandBranches.meta.js
// @match        https://wiki.biligame.com/sr/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
	"use strict";
	var style_default = ".elypha-bwiki-expanded-branches {\n  background-color: #c1c1c1;\n}\n\n.elypha-bwiki-expanded-branches > .plotOptions {\n  color: #fff;\n  cursor: default;\n  border: 2px solid #e1cb9a;\n  background: rgba(0, 0, 0, 0.5);\n}\n\n.elypha-bwiki-expanded-branches > .mailOptions {\n  color: #000;\n  cursor: default;\n  border: 1px solid #ababab;\n  background: #f5f5f5;\n}\n\n.elypha-bwiki-expanded-branches > .elypha-bwiki-expanded-branch-content {\n  display: block !important;\n}\n\n.elypha-bwiki-expanded-branches > .elypha-bwiki-expanded-branch-content > .plotFrame,\n.elypha-bwiki-expanded-branches > .elypha-bwiki-expanded-branch-content > .mailFrame {\n  margin-inline-start: 0rem;\n  padding-inline-start: 1.5rem;\n  border-inline-start: 0.5rem solid rgba(96, 96, 96, 0.5);\n}";
	var expandedBoxClass = "elypha-bwiki-expanded-branches";
	var expandedContentClass = "elypha-bwiki-expanded-branch-content";
	var contentRootSelector = "#mw-content-text";
	var branchTypes = [{
		boxClass: "plotBox",
		optionClass: "plotOptions",
		contentClass: "content"
	}, {
		boxClass: "mailBox",
		optionClass: "mailOptions",
		contentClass: "messageContent"
	}];
	function main() {
		const root = document.querySelector(contentRootSelector);
		if (!root) return;
		const style = document.createElement("style");
		style.textContent = style_default;
		document.head.appendChild(style);
		const boxSelector = branchTypes.map(({ boxClass }) => `.${boxClass}`).join(", ");
		expandBoxes(root.querySelectorAll(boxSelector));
		new MutationObserver((mutations) => {
			const changedBoxes = new Set();
			for (const mutation of mutations) {
				collectBranchBoxes(mutation.target, root, changedBoxes, false);
				mutation.addedNodes.forEach((node) => collectBranchBoxes(node, root, changedBoxes, true));
			}
			expandBoxes(changedBoxes);
		}).observe(root, {
			childList: true,
			subtree: true
		});
	}
	main();
	function expandBoxes(boxes) {
		for (const box of boxes) {
			const branchType = getBranchType(box);
			if (branchType) expandBranchBox(box, branchType);
		}
	}
	function getBranchType(box) {
		return branchTypes.find((branchType) => box.classList.contains(branchType.boxClass));
	}
	function expandBranchBox(box, branchType) {
		const options = getDirectChildren(box, branchType.optionClass);
		const contents = getDirectChildren(box, branchType.contentClass);
		if (options.length === 0) return;
		box.classList.add(expandedBoxClass);
		options.forEach((option, index) => {
			const content = contents[index];
			if (!content) return;
			content.classList.add(expandedContentClass);
			if (option.nextElementSibling !== content) option.after(content);
		});
		contents.slice(options.length).forEach((content) => {
			content.classList.toggle(expandedContentClass, content.innerHTML.trim() !== "");
		});
	}
	function getDirectChildren(box, className) {
		return Array.from(box.children).filter((child) => child.classList.contains(className));
	}
	function collectBranchBoxes(node, root, boxes, includeDescendants) {
		const element = node instanceof Element ? node : node.parentElement;
		if (!element || !root.contains(element)) return;
		for (const { boxClass } of branchTypes) {
			const selector = `.${boxClass}`;
			const containingBox = element.closest(selector);
			if (containingBox && root.contains(containingBox)) boxes.add(containingBox);
			if (includeDescendants) element.querySelectorAll(selector).forEach((box) => boxes.add(box));
		}
	}
})();
