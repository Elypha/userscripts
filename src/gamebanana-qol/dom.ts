export function createButton(text: string, className = ""): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.className = className;
  return button;
}

export function createPanelHeading(title: string, href?: string): HTMLHeadingElement {
  const heading = document.createElement("h2");
  heading.className = "gbq-panel-heading";
  if (href) {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = title;
    heading.append(link);
  } else heading.textContent = title;
  return heading;
}

export function ensureSection(parent: HTMLElement, className: string, tag = "div"): HTMLElement {
  let section = parent.querySelector<HTMLElement>(`:scope > .${className}`);
  if (!section) {
    section = document.createElement(tag);
    section.className = className;
    parent.append(section);
  }
  return section;
}

export function moveContents(source: Element, target: Element): void {
  target.append(...source.childNodes);
}
