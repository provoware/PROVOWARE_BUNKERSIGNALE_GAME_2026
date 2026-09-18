const CHECKPOINT = "I01";

export async function loadBuildInfo() {
  const versionUrl = new URL("../../../VERSION", import.meta.url);
  try {
    const response = await fetch(versionUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`VERSION request failed with ${response.status}`);
    }
    const version = (await response.text()).trim();
    if (!version) {
      throw new Error("VERSION is empty");
    }
    return Object.freeze({
      version,
      buildId: `${version}+${CHECKPOINT}`,
      source: "VERSION",
    });
  } catch (error) {
    console.warn("VERSION konnte nicht geladen werden; Buildinfo-Fallback aktiv.", error);
    return Object.freeze({
      version: "unbekannt",
      buildId: CHECKPOINT,
      source: "Fallback",
    });
  }
}
