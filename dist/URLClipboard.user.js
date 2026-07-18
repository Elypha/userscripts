// ==UserScript==
// @name         URL Clipboard
// @namespace    https://github.com/Elypha/userscripts
// @version      1.0.0
// @author       Elypha
// @description  Copy the current URL in encoded or Unicode form after a flowmouse:gesture event.
// @license      Apache-2.0
// @homepageURL  https://github.com/Elypha/userscripts
// @supportURL   https://github.com/Elypha/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/URLClipboard.user.js
// @updateURL    https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/URLClipboard.meta.js
// @match        http://*/*
// @match        https://*/*
// @grant        GM.setClipboard
// @run-at       document-idle
// ==/UserScript==

(function() {
	"use strict";
	var _GM = (() => typeof GM != "undefined" ? GM : void 0)();
	var gestureEventType = "flowmouse:gesture";
	var encodedTarget = "copy-url-encoded";
	var unicodeTarget = "copy-url-unicode";
	window.addEventListener(gestureEventType, (event) => {
		const target = event.detail?.target;
		if (target === encodedTarget) _GM.setClipboard(location.href, "text");
		else if (target === unicodeTarget) _GM.setClipboard(decodeURI(location.href), "text");
	});
})();
