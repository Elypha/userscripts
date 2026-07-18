import { waitForElement } from "../shared/dom";
import styleText from "./style.scss?inline";

interface LanguageFilter {
  label: string;
  colour: string;
  language: string;
  title: string;
}

const toolbarSelector = "#hdtb-tls";
const filterContainerClass = "elypha-language-filter";

const languageFilters: LanguageFilter[] = [
  {
    label: "文",
    colour: "hsl(0deg 100% 80%)",
    language: "lang_zh-CN",
    title: "简体中文",
  },
  {
    label: "書",
    colour: "hsl(0deg 100% 80%)",
    language: "lang_zh-TW",
    title: "繁體中文",
  },
  {
    label: "あ",
    colour: "hsl(220deg 100% 80%)",
    language: "lang_ja",
    title: "日本語",
  },
  {
    label: "A",
    colour: "hsl(240deg 100% 80%)",
    language: "lang_en",
    title: "English",
  },
];

function updateLanguageFilter(language: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("lr", language);
  window.location.assign(url);
}

function createFilterButton(filter: LanguageFilter): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = filter.label;
  button.title = filter.title;
  button.style.backgroundColor = filter.colour;
  button.addEventListener("click", () => updateLanguageFilter(filter.language));
  return button;
}

function addLanguageFilter(toolbar: Element): void {
  if (document.querySelector(`.${filterContainerClass}`)) return;

  const style = document.createElement("style");
  style.textContent = styleText;
  document.head.appendChild(style);

  const container = document.createElement("div");
  container.className = filterContainerClass;
  container.append(...languageFilters.map(createFilterButton));
  toolbar.after(container);
}

async function main(): Promise<void> {
  const toolbar = await waitForElement(toolbarSelector);
  addLanguageFilter(toolbar);
}

void main();
