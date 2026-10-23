// ==UserScript==
// @name         SKPORT: Export JSON
// @namespace    https://github.com/Elypha/userscripts
// @version      1.0.0
// @author       Elypha
// @description  Export named Endfield character and weapon rosters as JSON using data already loaded by the page.
// @license      Apache-2.0
// @homepageURL  https://github.com/Elypha/userscripts
// @supportURL   https://github.com/Elypha/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/game.skport.com-ExportJSON.user.js
// @updateURL    https://raw.githubusercontent.com/Elypha/userscripts/refs/heads/master/dist/game.skport.com-ExportJSON.meta.js
// @match        https://game.skport.com/tools/endfield/*
// @sandbox      raw
// @grant        none
// @inject-into  page
// @run-at       document-start
// @noframes
// ==/UserScript==

(function() {
	"use strict";
	var gameDataPath = "/web/v1/game/endfield/calculate/user-game-data";
	var characterNamesPath = "/web/v1/game/endfield/search-chars";
	var weaponNamesPath = "/web/v1/game/endfield/search-weapons";
	var observedPaths = new Set([
		gameDataPath,
		characterNamesPath,
		weaponNamesPath
	]);
	var characterNames = new Map();
	var weaponNames = new Map();
	var pendingCaptures = new Set();
	var snapshot;
	var requestSequence = 0;
	var snapshotSequence = 0;
	var exportButton;
	var exporting = false;
	function namesReady(data) {
		return Object.values(data.userChars).filter((character) => character.owned).every((character) => characterNames.has(character.charId) && weaponNames.has(character.weapon.weaponId)) && Object.values(data.userWeapons).every((weapon) => weaponNames.has(weapon.weaponId));
	}
	function updateButton() {
		if (!exportButton) return;
		const ready = snapshot !== void 0 && namesReady(snapshot);
		exportButton.disabled = exporting || !ready;
		if (!snapshot) exportButton.title = "Waiting for game data. Enable this script before refreshing the page.";
		else if (!ready) exportButton.title = "Waiting for character and weapon names from the page's existing requests.";
		else {
			const characterCount = Object.values(snapshot.userChars).filter((character) => character.owned).length;
			exportButton.title = `${characterCount} characters and ${Object.keys(snapshot.userWeapons).length} weapon types. Export without additional API requests.`;
		}
	}
	async function captureResponse(response, path, sequence) {
		if (!response.ok) return;
		const body = await response.clone().json();
		if (body.code !== 0 || !body.data) return;
		if (path === gameDataPath) {
			if (body.data.userGameData && sequence > snapshotSequence) {
				snapshot = body.data.userGameData;
				snapshotSequence = sequence;
			}
		} else if (path === characterNamesPath) for (const character of body.data.chars ?? []) characterNames.set(character.id, character.name);
		else if (path === weaponNamesPath) for (const weapon of body.data.weapons ?? []) weaponNames.set(weapon.id, weapon.name);
		updateButton();
	}
	var originalFetch = window.fetch;
	window.fetch = function(input, init) {
		const result = originalFetch.call(this, input, init);
		const url = new URL(input instanceof Request ? input.url : String(input), location.href);
		if (url.origin === "https://zonai.skport.com" && observedPaths.has(url.pathname)) {
			const sequence = ++requestSequence;
			result.then((response) => {
				const pending = captureResponse(response, url.pathname, sequence).catch((error) => {
					console.warn("[SKPORT Export JSON] Could not capture response:", url.pathname, error);
				});
				pendingCaptures.add(pending);
				pending.then(() => pendingCaptures.delete(pending));
			}, () => {});
		}
		return result;
	};
	function weaponRow(weapon) {
		return {
			name: weaponNames.get(weapon.weaponId),
			level: Number(weapon.level),
			refinement: Number(weapon.refineLevel),
			breakthrough: Number(weapon.breakthroughLevel)
		};
	}
	function buildBox(data) {
		return {
			characters: Object.values(data.userChars).filter((character) => character.owned).map((character) => ({
				name: characterNames.get(character.charId),
				level: Number(character.level),
				potential: Number(character.potentialLevel),
				breakthrough: Number(character.evolvePhase),
				weapon: weaponRow(character.weapon)
			})),
			weapons: Object.values(data.userWeapons).map(weaponRow)
		};
	}
	async function exportJson() {
		if (exporting) return;
		exporting = true;
		updateButton();
		try {
			await Promise.all([...pendingCaptures]);
			if (!snapshot || !namesReady(snapshot)) throw new Error("Game data or names are not ready yet.");
			const data = buildBox(snapshot);
			const exportedAt = new Date().toISOString();
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
			const downloadUrl = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = downloadUrl;
			link.download = `skport-endfield-${exportedAt.replace(/[:.]/g, "-")}.json`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1e3);
		} catch (error) {
			console.error("[SKPORT Export JSON] Export failed:", error);
			window.alert("Could not export JSON. See the browser console for details.");
		} finally {
			exporting = false;
			updateButton();
		}
	}
	function mountButton() {
		const host = document.createElement("div");
		host.id = "elypha-skport-export-json";
		const shadow = host.attachShadow({ mode: "open" });
		const style = document.createElement("style");
		style.textContent = `
    :host {
      all: initial;
      position: fixed;
      left: 16px;
      bottom: 16px;
      z-index: 2147483647;
    }
    button {
      padding: 10px 16px;
      border: 1px solid #171717;
      border-radius: 6px;
      background: #ffea00;
      color: #171717;
      font: 600 14px/1.4 system-ui, sans-serif;
      box-shadow: 0 2px 8px #0005;
      cursor: pointer;
    }
    button:hover:enabled {
      background: #fff45c;
    }
    button:disabled {
      opacity: 0.55;
      cursor: wait;
    }
  `;
		exportButton = document.createElement("button");
		exportButton.type = "button";
		exportButton.textContent = "Export JSON";
		exportButton.addEventListener("click", (event) => {
			event.stopPropagation();
			exportJson();
		});
		shadow.append(style, exportButton);
		document.body.appendChild(host);
		updateButton();
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountButton, { once: true });
	else mountButton();
})();
