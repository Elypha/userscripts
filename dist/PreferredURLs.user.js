// ==UserScript==
// @name         Preferred URLs
// @namespace    https://github.com/Elypha/userscripts
// @version      1.0.0
// @author       Elypha
// @description  Normalise Booth, NGA, and Wikipedia URLs to preferred forms.
// @license      Apache-2.0
// @homepageURL  https://github.com/Elypha/userscripts
// @supportURL   https://github.com/Elypha/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/PreferredURLs.user.js
// @updateURL    https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/PreferredURLs.meta.js
// @match        https://booth.pm/*
// @match        https://*.booth.pm/*
// @match        *://g.nga.cn/*
// @match        *://nga.178.com/*
// @match        *://ngabbs.com/*
// @match        *://ngacn.cc/*
// @match        http://bbs.nga.cn/*
// @match        https://*.m.wikipedia.org/*
// @match        https://zh.wikipedia.org/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
	"use strict";
	var ngaAlternativeHosts = new Set([
		"g.nga.cn",
		"nga.178.com",
		"ngabbs.com",
		"ngacn.cc"
	]);
	var wikipediaVariantPath = /^\/(?:zh|zh-(?:cn|hans|hant|hk|mo|my|sg|tw))\//;
	function getPreferredUrl(url) {
		const preferredUrl = preferBoothUrl(url) ?? preferNgaUrl(url) ?? preferWikipediaUrl(url);
		return preferredUrl?.href === url.href ? void 0 : preferredUrl;
	}
	function preferBoothUrl(url) {
		if (!isBoothHost(url.hostname)) return void 0;
		const itemMatch = /^\/(?:[^/]+\/)?items\/(\d+)\/?$/.exec(url.pathname);
		if (!itemMatch?.[1]) return void 0;
		return new URL(`https://booth.pm/ja/items/${itemMatch[1]}`);
	}
	function isBoothHost(hostname) {
		return hostname === "booth.pm" || hostname.endsWith(".booth.pm");
	}
	function preferNgaUrl(url) {
		const isAlternativeHost = ngaAlternativeHosts.has(url.hostname);
		const isInsecurePreferredHost = url.hostname === "bbs.nga.cn" && url.protocol === "http:";
		if (!isAlternativeHost && !isInsecurePreferredHost) return void 0;
		const preferredUrl = new URL(url);
		preferredUrl.protocol = "https:";
		preferredUrl.hostname = "bbs.nga.cn";
		preferredUrl.port = "";
		return preferredUrl;
	}
	function preferWikipediaUrl(url) {
		if (!url.hostname.endsWith(".wikipedia.org")) return void 0;
		const preferredUrl = new URL(url);
		if (preferredUrl.hostname.endsWith(".m.wikipedia.org")) preferredUrl.hostname = preferredUrl.hostname.replace(/\.m\.wikipedia\.org$/, ".wikipedia.org");
		if (preferredUrl.hostname === "zh.wikipedia.org" && wikipediaVariantPath.test(preferredUrl.pathname)) preferredUrl.pathname = preferredUrl.pathname.replace(wikipediaVariantPath, "/zh-cn/");
		return preferredUrl.href === url.href ? void 0 : preferredUrl;
	}
	function main() {
		const preferredUrl = getPreferredUrl(new URL(window.location.href));
		if (preferredUrl) window.location.replace(preferredUrl.href);
	}
	main();
})();
