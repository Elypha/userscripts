import { GM } from "$";

const gestureEventType = "flowmouse:gesture";
const encodedTarget = "copy-url-encoded";
const unicodeTarget = "copy-url-unicode";

window.addEventListener(gestureEventType, (event) => {
  const target = (event as CustomEvent<{ target?: unknown }>).detail?.target;

  if (target === encodedTarget) {
    GM.setClipboard(location.href, "text");
  } else if (target === unicodeTarget) {
    GM.setClipboard(decodeURI(location.href), "text");
  }
});
