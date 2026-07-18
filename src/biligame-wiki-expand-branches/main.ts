import styleText from "./style.scss?inline";

interface BranchType {
  boxClass: string;
  contentClass: string;
  optionClass: string;
}

const expandedBoxClass = "elypha-bwiki-expanded-branches";
const expandedContentClass = "elypha-bwiki-expanded-branch-content";
const contentRootSelector = "#mw-content-text";

const branchTypes: BranchType[] = [
  { boxClass: "plotBox", optionClass: "plotOptions", contentClass: "content" },
  { boxClass: "mailBox", optionClass: "mailOptions", contentClass: "messageContent" },
];

function getDirectChildren(box: Element, className: string): Element[] {
  return Array.from(box.children).filter((child) => child.classList.contains(className));
}

function expandBranchBox(box: Element, branchType: BranchType): void {
  const options = getDirectChildren(box, branchType.optionClass);
  const contents = getDirectChildren(box, branchType.contentClass);

  if (options.length === 0) {
    return;
  }

  box.classList.add(expandedBoxClass);

  options.forEach((option, index) => {
    const content = contents[index];
    if (!content) {
      return;
    }

    content.classList.add(expandedContentClass);
    if (option.nextElementSibling !== content) {
      option.after(content);
    }
  });

  contents.slice(options.length).forEach((content) => {
    content.classList.toggle(expandedContentClass, content.innerHTML.trim() !== "");
  });
}

function getBranchType(box: Element): BranchType | undefined {
  return branchTypes.find((branchType) => box.classList.contains(branchType.boxClass));
}

function collectBranchBoxes(node: Node, root: Element, boxes: Set<Element>, includeDescendants: boolean): void {
  const element = node instanceof Element ? node : node.parentElement;
  if (!element || !root.contains(element)) {
    return;
  }

  for (const { boxClass } of branchTypes) {
    const selector = `.${boxClass}`;
    const containingBox = element.closest(selector);
    if (containingBox && root.contains(containingBox)) {
      boxes.add(containingBox);
    }

    if (includeDescendants) {
      element.querySelectorAll(selector).forEach((box) => boxes.add(box));
    }
  }
}

function expandBoxes(boxes: Iterable<Element>): void {
  for (const box of boxes) {
    const branchType = getBranchType(box);
    if (branchType) {
      expandBranchBox(box, branchType);
    }
  }
}

function main(): void {
  const root = document.querySelector(contentRootSelector);
  if (!root) {
    return;
  }

  const style = document.createElement("style");
  style.textContent = styleText;
  document.head.appendChild(style);

  const boxSelector = branchTypes.map(({ boxClass }) => `.${boxClass}`).join(", ");
  expandBoxes(root.querySelectorAll(boxSelector));

  const observer = new MutationObserver((mutations) => {
    const changedBoxes = new Set<Element>();

    for (const mutation of mutations) {
      collectBranchBoxes(mutation.target, root, changedBoxes, false);
      mutation.addedNodes.forEach((node) => collectBranchBoxes(node, root, changedBoxes, true));
    }

    expandBoxes(changedBoxes);
  });

  observer.observe(root, { childList: true, subtree: true });
}

main();
