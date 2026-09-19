import { createGameShellSnapshot } from "../application/game-shell.js";
import { classifyStorageHealth } from "../application/storage-health.js";
import { createHealthSnapshot } from "../application/health.js";
import { detectBrowserCapabilities } from "../infrastructure/browser/capabilities.js";
import { readBrowserStorageHealth } from "../infrastructure/browser/storage-health.js";
import { loadBuildInfo } from "../infrastructure/runtime/build-info.js";
import { renderApp } from "../ui/app.js";

export async function startApp(root) {
  if (!(root instanceof HTMLElement)) {
    throw new TypeError("App root element is missing.");
  }

  const gameShell = createGameShellSnapshot();

  async function refresh() {
    const [build, capabilities, storageSample] = await Promise.all([
      loadBuildInfo(),
      Promise.resolve(detectBrowserCapabilities()),
      readBrowserStorageHealth(),
    ]);
    const snapshot = createHealthSnapshot({
      build,
      capabilities,
      checkedAt: new Date().toISOString(),
    });
    renderApp(root, snapshot, {
      onRefresh: refresh,
      gameShell,
      storageHealth: classifyStorageHealth(storageSample),
    });
  }

  await refresh();
  root.setAttribute("aria-busy", "false");
}
