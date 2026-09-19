const STATUS = Object.freeze({
  OK: "ok",
  WARNING: "warning",
  INFO: "info",
});

function capabilityStatus(available) {
  return available ? STATUS.OK : STATUS.WARNING;
}

export function createHealthSnapshot({ build, capabilities, checkedAt }) {
  return Object.freeze({
    checkedAt,
    appVersion: build.version,
    buildId: build.buildId,
    buildSource: build.source,
    overallStatus: capabilities.esModules && capabilities.fetchApi ? STATUS.OK : STATUS.WARNING,
    runtime: Object.freeze([
      {
        id: "modules",
        label: "Moderne JavaScript-Module",
        status: capabilityStatus(capabilities.esModules),
        detail: capabilities.esModules ? "Verfügbar" : "Nicht verfügbar",
      },
      {
        id: "fetch",
        label: "Lokale Ressourcen laden",
        status: capabilityStatus(capabilities.fetchApi),
        detail: capabilities.fetchApi ? "Verfügbar" : "Nicht verfügbar",
      },
      {
        id: "indexeddb",
        label: "Lokaler Datenbankspeicher",
        status: capabilityStatus(capabilities.indexedDb),
        detail: capabilities.indexedDb ? "Browser unterstützt IndexedDB" : "IndexedDB fehlt; persistente Weltdaten wären nicht möglich",
      },
      {
        id: "crypto",
        label: "Browser-Kryptografie",
        status: capabilityStatus(capabilities.cryptoSubtle),
        detail: capabilities.cryptoSubtle ? "Verfügbar" : "Nicht verfügbar; spätere Integritätsfunktionen wären eingeschränkt",
      },
      {
        id: "reduced-motion",
        label: "Bewegungsreduktion",
        status: STATUS.INFO,
        detail: capabilities.prefersReducedMotion ? "Im System gewünscht" : "Nicht angefordert",
      },
    ]),
    project: Object.freeze({
      worldVersion: "Noch keine Welt geöffnet",
      databaseStatus: "Persistenz-Bausteine vorhanden; Diagnose führt keine Schreibaktion aus",
      contentStatus: "Lokale Content-Basis vorhanden; Diagnose aktiviert keine Spielinhalte",
      syncStatus: "Noch nicht aktiv",
      quarantineStatus: "Noch nicht aktiv",
      recoveryMode: "Read-only Diagnose; keine Reparatur- oder Löschaktion",
    }),
  });
}
