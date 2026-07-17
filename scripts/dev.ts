import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build, type Plugin } from "vite";
import WebSocket, { WebSocketServer } from "ws";

import { findTarget, targets } from "./targets";
import { createViteConfig } from "./vite-config";

const requestedId = process.argv[2];
const target = requestedId ? findTarget(requestedId) : undefined;

if (!target) {
  const availableTargets = targets.map(({ id }) => `  - ${id}`).join("\n");
  throw new Error(`Usage: bun run dev <target>\n\nAvailable targets:\n${availableTargets}`);
}

const selectedTarget = target;
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory = resolve(repositoryRoot, ".local/scriptcat");
const outputPath = resolve(outputDirectory, selectedTarget.fileName);
const scriptUri = pathToFileURL(outputPath).href;
let latestUpdate: string | undefined;

const userscript = { ...selectedTarget.userscript };
userscript.name = `dev: ${userscript.name}`;
delete userscript.downloadURL;
delete userscript.updateURL;

const developmentTarget = { ...selectedTarget, userscript };

const server = new WebSocketServer({ host: "localhost", port: 8642 });
server.on("connection", (socket) => {
  socket.send(JSON.stringify({ action: "hello" }));
  if (latestUpdate) {
    socket.send(latestUpdate);
  }
  console.log("ScriptCat connected.");
  socket.on("close", () => console.log("ScriptCat disconnected."));
});

await new Promise<void>((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});

async function syncUserscript(): Promise<void> {
  const script = await readFile(outputPath, "utf8");
  const update = JSON.stringify({ action: "onchange", data: { script, uri: scriptUri } });
  latestUpdate = update;
  const clients = [...server.clients].filter((client) => client.readyState === WebSocket.OPEN);
  clients.forEach((client) => client.send(update));
  console.log(clients.length === 0 ? `built ${selectedTarget.id}; waiting for ScriptCat at ws://localhost:8642` : `built and synced ${selectedTarget.id}`);
}

const syncPlugin: Plugin = {
  name: "scriptcat-sync",
  writeBundle: syncUserscript,
};

const config = createViteConfig(developmentTarget, true, false);
await build({
  ...config,
  plugins: [...(config.plugins ?? []), syncPlugin],
  build: {
    ...config.build,
    outDir: outputDirectory,
    watch: {},
  },
});
