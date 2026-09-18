export function detectBrowserCapabilities(scope = globalThis) {
  const navigatorRef = scope.navigator;
  const mediaQuery = typeof scope.matchMedia === "function"
    ? scope.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  return Object.freeze({
    esModules: true,
    fetchApi: typeof scope.fetch === "function",
    indexedDb: typeof scope.indexedDB !== "undefined",
    cryptoSubtle: Boolean(scope.crypto && scope.crypto.subtle),
    fileApi: typeof scope.File !== "undefined" && typeof scope.FileReader !== "undefined",
    webLocks: Boolean(navigatorRef && navigatorRef.locks),
    online: navigatorRef ? navigatorRef.onLine !== false : true,
    prefersReducedMotion: Boolean(mediaQuery && mediaQuery.matches),
  });
}
