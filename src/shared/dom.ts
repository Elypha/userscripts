export function waitForElement<T extends Element>(selector: string, root: Document | Element = document): Promise<T> {
  const existingElement = root.querySelector<T>(selector);
  if (existingElement) return Promise.resolve(existingElement);

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const element = root.querySelector<T>(selector);
      if (!element) return;

      observer.disconnect();
      resolve(element);
    });

    const observationRoot = root instanceof Document ? root.documentElement : root;
    observer.observe(observationRoot, { childList: true, subtree: true });
  });
}
