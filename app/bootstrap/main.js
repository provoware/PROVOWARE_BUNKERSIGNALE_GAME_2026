import { createHealthSnapshot } from "../application/health.js";
import { detectBrowserCapabilities } from "../infrastructure/browser/capabilities.js";
import { loadBuildInfo } from "../infrastructure/runtime/build-info.js";
import { renderApp } from "../ui/app.js";

export async function startApp(root) {
  if (!(root instanceof HTMLElement)) {
    throw new TypeError("App root element is missing.");
  }

  async function refresh() {
    const [build, capabilities] = await Promise.all([
      loadBuildInfo(),
      Promise.resolve(detectBrowserCapabilities()),
    ]);
    const snapshot = createHealthSnapshot({
      build,
      capabilities,
      checkedAt: new Date().toISOString(),
    });
    renderApp(root, snapshot, { onRefresh: refresh });
  }

  await refresh();
  root.setAttribute("aria-busy", "false");
}
