import { getPreferredUrl } from "./rules";

function main(): void {
  const preferredUrl = getPreferredUrl(new URL(window.location.href));
  if (preferredUrl) {
    window.location.replace(preferredUrl.href);
  }
}

main();
