const listSelector = ".bili-dyn-list";
const itemSelector = ".bili-dyn-list__item";
const descriptionSelector = ".bili-dyn-content__forw__desc .bili-rich-text__content";
const mentionSelector = 'span.at[data-type="at"]';
const bodySelector = ".bili-dyn-item__body";

let currentList: Element | null = null;

function hideLotteryResult(item: Element): void {
  const description = item.querySelector(descriptionSelector);
  if (!description || !/恭喜[\s\S]*中奖/.test(description.textContent ?? "")) {
    return;
  }

  if (description.querySelectorAll(mentionSelector).length < 2) {
    return;
  }

  const body = item.querySelector(bodySelector);
  if (!body) {
    return;
  }

  const placeholder = document.createElement("span");
  placeholder.textContent = "< Lottery Removed >";
  placeholder.style.cssText = "color: #999; display: block; font-size: 0.9em;";
  body.replaceChildren(placeholder);
}

function addItemsFromNode(node: Node, items: Set<Element>): void {
  const element = node instanceof Element ? node : node.parentElement;
  if (!element || !currentList?.contains(element)) {
    return;
  }

  const containingItem = element.closest(itemSelector);
  if (containingItem) {
    items.add(containingItem);
    return;
  }

  element.querySelectorAll(itemSelector).forEach((item) => items.add(item));
}

const listObserver = new MutationObserver((mutations) => {
  const changedItems = new Set<Element>();

  for (const mutation of mutations) {
    const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
    const containingItem = target?.closest(itemSelector);

    if (containingItem && currentList?.contains(containingItem)) {
      changedItems.add(containingItem);
      continue;
    }

    mutation.addedNodes.forEach((node) => addItemsFromNode(node, changedItems));
  }

  changedItems.forEach(hideLotteryResult);
});

function syncList(): void {
  const nextList = document.querySelector(listSelector);
  if (nextList === currentList) {
    return;
  }

  listObserver.disconnect();
  currentList = nextList;

  if (!currentList) {
    return;
  }

  currentList.querySelectorAll(itemSelector).forEach(hideLotteryResult);
  listObserver.observe(currentList, { childList: true, subtree: true, characterData: true });
}

const pageObserver = new MutationObserver(() => {
  if (!currentList?.isConnected) {
    syncList();
  }
});
pageObserver.observe(document.body, { childList: true, subtree: true });
syncList();
