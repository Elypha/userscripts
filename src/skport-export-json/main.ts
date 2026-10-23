export {};

type NumericValue = number | string;

interface NamedItem {
  id: string;
  name: string;
}

interface UserWeapon {
  weaponId: string;
  level: NumericValue;
  refineLevel: NumericValue;
  breakthroughLevel: NumericValue;
}

interface UserCharacter {
  charId: string;
  owned: boolean;
  level: NumericValue;
  potentialLevel: NumericValue;
  evolvePhase: NumericValue;
  weapon: UserWeapon;
}

interface UserGameData {
  userChars: Record<string, UserCharacter>;
  userWeapons: Record<string, UserWeapon>;
}

interface ApiResponse {
  code: number;
  data?: {
    userGameData?: UserGameData;
    chars?: NamedItem[];
    weapons?: NamedItem[];
  };
}

interface WeaponRow {
  name: string;
  level: number;
  refinement: number;
  breakthrough: number;
}

interface CharacterRow {
  name: string;
  level: number;
  potential: number;
  breakthrough: number;
  weapon: WeaponRow;
}

interface Box {
  characters: CharacterRow[];
  weapons: WeaponRow[];
}

const gameDataPath = "/web/v1/game/endfield/calculate/user-game-data";
const characterNamesPath = "/web/v1/game/endfield/search-chars";
const weaponNamesPath = "/web/v1/game/endfield/search-weapons";
const observedPaths = new Set([gameDataPath, characterNamesPath, weaponNamesPath]);
const characterNames = new Map<string, string>();
const weaponNames = new Map<string, string>();
const pendingCaptures = new Set<Promise<void>>();
let snapshot: UserGameData | undefined;
let requestSequence = 0;
let snapshotSequence = 0;
let exportButton: HTMLButtonElement | undefined;
let exporting = false;

function namesReady(data: UserGameData): boolean {
  return Object.values(data.userChars).filter((character) => character.owned).every((character) => (
    characterNames.has(character.charId) && weaponNames.has(character.weapon.weaponId)
  )) && Object.values(data.userWeapons).every((weapon) => weaponNames.has(weapon.weaponId));
}

function updateButton(): void {
  if (!exportButton) return;
  const ready = snapshot !== undefined && namesReady(snapshot);
  exportButton.disabled = exporting || !ready;
  if (!snapshot) {
    exportButton.title = "Waiting for game data. Enable this script before refreshing the page.";
  } else if (!ready) {
    exportButton.title = "Waiting for character and weapon names from the page's existing requests.";
  } else {
    const characterCount = Object.values(snapshot.userChars).filter((character) => character.owned).length;
    exportButton.title = `${characterCount} characters and ${Object.keys(snapshot.userWeapons).length} weapon types. Export without additional API requests.`;
  }
}

async function captureResponse(response: Response, path: string, sequence: number): Promise<void> {
  if (!response.ok) return;
  const body: ApiResponse = await response.clone().json();
  if (body.code !== 0 || !body.data) return;

  if (path === gameDataPath) {
    if (body.data.userGameData && sequence > snapshotSequence) {
      // Replace the whole snapshot; an older request finishing later must not overwrite it.
      snapshot = body.data.userGameData;
      snapshotSequence = sequence;
    }
  } else if (path === characterNamesPath) {
    for (const character of body.data.chars ?? []) characterNames.set(character.id, character.name);
  } else if (path === weaponNamesPath) {
    for (const weapon of body.data.weapons ?? []) weaponNames.set(weapon.id, weapon.name);
  }

  updateButton();
}

// Observe only these three endpoints and return the original promise without consuming its body.
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  const result = originalFetch.call(this, input, init);
  const url = new URL(input instanceof Request ? input.url : String(input), location.href);

  if (url.origin === "https://zonai.skport.com" && observedPaths.has(url.pathname)) {
    const sequence = ++requestSequence;
    void result.then((response) => {
      const pending = captureResponse(response, url.pathname, sequence).catch((error: unknown) => {
        console.warn("[SKPORT Export JSON] Could not capture response:", url.pathname, error);
      });
      pendingCaptures.add(pending);
      void pending.then(() => pendingCaptures.delete(pending));
    }, () => {});
  }

  return result;
};

function weaponRow(weapon: UserWeapon): WeaponRow {
  return {
    name: weaponNames.get(weapon.weaponId)!,
    level: Number(weapon.level),
    refinement: Number(weapon.refineLevel),
    breakthrough: Number(weapon.breakthroughLevel),
  };
}

function buildBox(data: UserGameData): Box {
  return {
    characters: Object.values(data.userChars).filter((character) => character.owned).map((character) => ({
      name: characterNames.get(character.charId)!,
      level: Number(character.level),
      potential: Number(character.potentialLevel),
      breakthrough: Number(character.evolvePhase),
      weapon: weaponRow(character.weapon),
    })),
    weapons: Object.values(data.userWeapons).map(weaponRow),
  };
}

async function exportJson(): Promise<void> {
  if (exporting) return;
  exporting = true;
  updateButton();

  try {
    // Finish parsing responses already received without waiting for or starting network requests.
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
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  } catch (error) {
    console.error("[SKPORT Export JSON] Export failed:", error);
    window.alert("Could not export JSON. See the browser console for details.");
  } finally {
    exporting = false;
    updateButton();
  }
}

function mountButton(): void {
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
    void exportJson();
  });
  shadow.append(style, exportButton);
  document.body.appendChild(host);
  updateButton();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountButton, { once: true });
} else {
  mountButton();
}
