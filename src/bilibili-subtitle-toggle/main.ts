import { GM_getValue, GM_setValue } from "$";

import { waitForElement } from "../shared/dom";

const preferenceKey = "subtitleEnabled";
const subtitleSelector = ".bpx-player-ctrl-subtitle";
const closeSelector = ".bpx-player-ctrl-subtitle-close-switch";
const languageSelector = ".bpx-player-ctrl-subtitle-language-item[data-lan]";
const primaryLanguageSelector = `.bpx-player-ctrl-subtitle-major ${languageSelector}`;
const activeClass = "bpx-state-active";

let playerWrapper: HTMLElement | null = null;
let subtitleControl: HTMLElement | null = null;
let lastLanguage: string | undefined;

const playerObserver = new MutationObserver(syncSubtitleControl);
const subtitleObserver = new MutationObserver(restorePreference);

void main();

async function main(): Promise<void> {
  document.addEventListener("keydown", handleKeyboard, true);
  document.addEventListener("click", handleClick, true);
  document.addEventListener("loadstart", (event) => {
    if (!(event.target instanceof HTMLVideoElement)) return;
    const wrapper = document.querySelector<HTMLElement>("#playerWrap");
    if (wrapper) observePlayer(wrapper);
  }, true);

  observePlayer(await waitForElement<HTMLElement>("#playerWrap"));
}

function observePlayer(wrapper: HTMLElement): void {
  if (wrapper !== playerWrapper) {
    playerObserver.disconnect();
    playerWrapper = wrapper;
    playerObserver.observe(wrapper, { childList: true, subtree: true });
  }
  syncSubtitleControl();
}

function syncSubtitleControl(): void {
  if (subtitleControl?.isConnected && playerWrapper?.contains(subtitleControl)) return;

  subtitleObserver.disconnect();
  subtitleControl = playerWrapper?.querySelector<HTMLElement>(subtitleSelector) ?? null;
  if (!subtitleControl) return;

  subtitleObserver.observe(subtitleControl, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  restorePreference();
}

function getControls() {
  if (!subtitleControl?.isConnected) return null;

  const closeButton = subtitleControl.querySelector<HTMLElement>(closeSelector);
  const languages = Array.from(subtitleControl.querySelectorAll<HTMLElement>(primaryLanguageSelector));
  if (!closeButton || languages.length === 0) return null;

  const selectedLanguage = languages.find((language) => language.classList.contains(activeClass));
  const enabled = !closeButton.classList.contains(activeClass);
  if (enabled && !selectedLanguage) return null;
  if (selectedLanguage) lastLanguage = selectedLanguage.dataset.lan;

  const languageButton = selectedLanguage ?? languages.find((language) => language.dataset.lan === lastLanguage) ?? languages[0];
  return { closeButton, languageButton, enabled };
}

function restorePreference(): void {
  const controls = getControls();
  if (!controls) return;

  const enabled = GM_getValue<boolean>(preferenceKey, true);
  if (enabled === controls.enabled) return;
  (enabled ? controls.languageButton : controls.closeButton).click();
}

function handleKeyboard(event: KeyboardEvent): void {
  if (event.code !== "KeyC" || event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
  if (event.composedPath().some((target) => target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable))) return;

  const controls = getControls();
  if (!controls) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  GM_setValue(preferenceKey, !controls.enabled);
  restorePreference();
}

function handleClick(event: MouseEvent): void {
  if (!event.isTrusted || !(event.target instanceof Element)) return;

  const button = event.target.closest(`${closeSelector}, ${languageSelector}`);
  if (!button || !subtitleControl?.contains(button) || !getControls()) return;

  GM_setValue(preferenceKey, !button.matches(closeSelector));
}
