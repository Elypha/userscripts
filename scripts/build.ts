import { build } from "vite";

import { targets } from "./targets";
import { createViteConfig } from "./vite-config";

for (const [index, target] of targets.entries()) {
  await build(createViteConfig(target, index === 0));
  console.log(`built ${target.id} -> dist/${target.fileName}`);
}
