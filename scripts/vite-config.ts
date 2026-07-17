import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

import type { UserscriptTarget } from "./targets";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

export function createViteConfig(target: UserscriptTarget, emptyOutDir: boolean, metaFileName = true) {
  return defineConfig({
    root: repositoryRoot,
    plugins: [
      monkey({
        entry: resolve(repositoryRoot, target.entry),
        userscript: target.userscript,
        build: {
          fileName: target.fileName,
          metaFileName,
        },
      }),
    ],
    build: {
      emptyOutDir,
      cssMinify: false,
    },
  });
}
