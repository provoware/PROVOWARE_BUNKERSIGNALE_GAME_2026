function frozenList(items) {
  return Object.freeze(items.map(item => Object.freeze({ ...item })));
}

export function createGameShellSnapshot() {
  return Object.freeze({
    mode: "regression_fixture",
    statusLabel: "Read-only · keine Weltmutation",
    worldLabel: "Regression-Welt",
    scene: Object.freeze({
      title: "Bunkerzugang",
      location: "Sektor Null",
      description: "Diese Ansicht ist eine feste UI-Referenz. Sie zeigt spätere Spielbereiche, führt aber noch keine Spielaktion aus.",
    }),
    actors: frozenList([
      { id: "actor-a", label: "Funkerin", state: "wartet" },
      { id: "actor-b", label: "Beobachter", state: "ruhig" },
      { id: "actor-c", label: "Kontakt 03", state: "unbekannt" },
    ]),
    details: frozenList([
      { label: "Ort", value: "Bunkerzugang · Sektor Null" },
      { label: "Signal", value: "Testträger aktiv" },
      { label: "Modus", value: "Nur Ansicht" },
    ]),
    events: Object.freeze([
      "Regression-Szene geladen.",
      "Keine Welt- oder Persistenzdaten wurden verändert.",
    ]),
    actions: Object.freeze(["Untersuchen", "Reden", "Inventar", "Weiter"]),
  });
}
