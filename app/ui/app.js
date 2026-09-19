function element(documentRef, tag, options = {}) {
  const node = documentRef.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  return node;
}

function statusLabel(status) {
  if (status === "ok") return "OK";
  if (status === "warning") return "Hinweis";
  return "Info";
}

function renderHealthList(documentRef, items) {
  const list = element(documentRef, "ul", { className: "ssi-health-list" });
  for (const item of items) {
    const row = element(documentRef, "li", { className: "ssi-health-row" });
    const text = element(documentRef, "div");
    const title = element(documentRef, "strong", { text: item.label });
    const detail = element(documentRef, "p", { text: item.detail });
    const chip = element(documentRef, "span", {
      className: `ssi-status ssi-status--${item.status}`,
      text: statusLabel(item.status),
    });
    text.append(title, detail);
    row.append(text, chip);
    list.append(row);
  }
  return list;
}

function renderOverview(documentRef, snapshot) {
  const section = element(documentRef, "section", { className: "ssi-panel" });
  section.id = "overview-panel";
  section.tabIndex = -1;
  const heading = element(documentRef, "h2", { text: "Technische Basis bereit" });
  const copy = element(documentRef, "p", {
    text: "Die technische Grundlage ist aktiv. Die neue Spielansicht dient zunächst als read-only Regressionstest; Spielaktionen bleiben noch deaktiviert.",
  });
  const meta = element(documentRef, "dl", { className: "ssi-meta" });
  const values = [
    ["App-Version", snapshot.appVersion],
    ["Build-ID", snapshot.buildId],
    ["Letzte Prüfung", snapshot.checkedAt],
  ];
  for (const [label, value] of values) {
    meta.append(
      element(documentRef, "dt", { text: label }),
      element(documentRef, "dd", { text: value }),
    );
  }
  section.append(heading, copy, meta);
  return section;
}

function renderGame(documentRef, gameShell) {
  const section = element(documentRef, "section", { className: "ssi-panel ssi-game-panel" });
  section.id = "game-panel";
  section.tabIndex = -1;
  section.hidden = true;
  section.dataset.regressionSurface = "game-shell";

  const headingRow = element(documentRef, "div", { className: "ssi-game-heading" });
  headingRow.append(
    element(documentRef, "div"),
    element(documentRef, "span", { className: "ssi-status ssi-status--info", text: gameShell.statusLabel }),
  );
  headingRow.firstElementChild.append(
    element(documentRef, "h2", { text: "Spielansicht · Regression" }),
    element(documentRef, "p", { text: `${gameShell.worldLabel} · feste Referenzansicht ohne aktive Spiellogik` }),
  );

  const grid = element(documentRef, "div", { className: "ssi-game-grid" });

  const actors = element(documentRef, "section", { className: "ssi-game-region" });
  actors.setAttribute("aria-labelledby", "game-actors-title");
  const actorsTitle = element(documentRef, "h3", { text: "Figuren" });
  actorsTitle.id = "game-actors-title";
  const actorList = element(documentRef, "ul", { className: "ssi-game-list" });
  for (const actor of gameShell.actors) {
    const item = element(documentRef, "li");
    item.append(
      element(documentRef, "strong", { text: actor.label }),
      element(documentRef, "span", { text: actor.state }),
    );
    actorList.append(item);
  }
  actors.append(actorsTitle, actorList);

  const scene = element(documentRef, "article", { className: "ssi-game-region ssi-scene-card" });
  scene.setAttribute("aria-labelledby", "game-scene-title");
  const sceneTitle = element(documentRef, "h3", { text: gameShell.scene.title });
  sceneTitle.id = "game-scene-title";
  scene.append(
    sceneTitle,
    element(documentRef, "p", { className: "ssi-game-location", text: gameShell.scene.location }),
    element(documentRef, "p", { text: gameShell.scene.description }),
  );

  const details = element(documentRef, "section", { className: "ssi-game-region" });
  details.setAttribute("aria-labelledby", "game-details-title");
  const detailsTitle = element(documentRef, "h3", { text: "Details" });
  detailsTitle.id = "game-details-title";
  const detailList = element(documentRef, "dl", { className: "ssi-meta ssi-game-meta" });
  for (const item of gameShell.details) {
    detailList.append(
      element(documentRef, "dt", { text: item.label }),
      element(documentRef, "dd", { text: item.value }),
    );
  }
  details.append(detailsTitle, detailList);

  const events = element(documentRef, "section", { className: "ssi-game-region ssi-game-events" });
  events.setAttribute("aria-labelledby", "game-events-title");
  const eventsTitle = element(documentRef, "h3", { text: "Ereignis / Log" });
  eventsTitle.id = "game-events-title";
  const eventList = element(documentRef, "ol", { className: "ssi-game-log" });
  for (const entry of gameShell.events) {
    eventList.append(element(documentRef, "li", { text: entry }));
  }
  events.append(eventsTitle, eventList);

  grid.append(actors, scene, details, events);

  const actions = element(documentRef, "div", { className: "ssi-game-actions" });
  actions.setAttribute("aria-label", "Spätere Spielaktionen");
  for (const label of gameShell.actions) {
    const button = element(documentRef, "button", { className: "ssi-button ssi-game-action", text: label });
    button.type = "button";
    button.disabled = true;
    button.title = "Noch nicht aktiv – Regressionansicht ist read-only";
    actions.append(button);
  }

  section.append(headingRow, grid, actions);
  return section;
}

function renderDiagnostics(documentRef, snapshot, onRefresh) {
  const section = element(documentRef, "section", { className: "ssi-panel" });
  section.id = "diagnostics-panel";
  section.tabIndex = -1;
  section.hidden = true;
  const heading = element(documentRef, "h2", { text: "Diagnose & Recovery" });
  const intro = element(documentRef, "p", {
    text: "Die Diagnose liest nur Fähigkeiten und Status. Dieser Bereich verändert, repariert oder löscht keine Weltdaten.",
  });
  const project = element(documentRef, "dl", { className: "ssi-meta" });
  const values = [
    ["Welt", snapshot.project.worldVersion],
    ["Datenbank", snapshot.project.databaseStatus],
    ["Content", snapshot.project.contentStatus],
    ["Sync", snapshot.project.syncStatus],
    ["Quarantäne", snapshot.project.quarantineStatus],
    ["Recovery", snapshot.project.recoveryMode],
  ];
  for (const [label, value] of values) {
    project.append(
      element(documentRef, "dt", { text: label }),
      element(documentRef, "dd", { text: value }),
    );
  }
  const refresh = element(documentRef, "button", { className: "ssi-button", text: "Diagnose aktualisieren" });
  refresh.type = "button";
  refresh.addEventListener("click", () => onRefresh());
  section.append(heading, intro, project, renderHealthList(documentRef, snapshot.runtime), refresh);
  return section;
}

export function renderApp(root, snapshot, { onRefresh, gameShell }) {
  const documentRef = root.ownerDocument;
  root.replaceChildren();

  const header = element(documentRef, "header", { className: "ssi-header" });
  const titleBox = element(documentRef, "div");
  titleBox.append(
    element(documentRef, "p", { className: "ssi-kicker", text: "PROVOWARE · TECHNISCHE BASIS" }),
    element(documentRef, "h1", { text: "S.O.U.N.D. SYSTEM-IKER" }),
  );
  const overall = element(documentRef, "span", {
    className: `ssi-status ssi-status--${snapshot.overallStatus}`,
    text: snapshot.overallStatus === "ok" ? "Startpfad OK" : "Start mit Hinweisen",
  });
  header.append(titleBox, overall);

  const nav = element(documentRef, "nav", { className: "ssi-tabs" });
  nav.setAttribute("aria-label", "Hauptbereiche");
  const overviewButton = element(documentRef, "button", { className: "ssi-tab", text: "Übersicht" });
  const gameButton = element(documentRef, "button", { className: "ssi-tab", text: "Spiel" });
  const diagnosticsButton = element(documentRef, "button", { className: "ssi-tab", text: "Diagnose & Recovery" });
  for (const button of [overviewButton, gameButton, diagnosticsButton]) button.type = "button";
  nav.append(overviewButton, gameButton, diagnosticsButton);

  const panels = {
    overview: renderOverview(documentRef, snapshot),
    game: renderGame(documentRef, gameShell),
    diagnostics: renderDiagnostics(documentRef, snapshot, onRefresh),
  };
  const buttons = {
    overview: overviewButton,
    game: gameButton,
    diagnostics: diagnosticsButton,
  };

  function select(panelName) {
    for (const [name, panel] of Object.entries(panels)) {
      const selected = name === panelName;
      panel.hidden = !selected;
      buttons[name].setAttribute("aria-pressed", String(selected));
    }
    panels[panelName].focus?.();
  }

  overviewButton.addEventListener("click", () => select("overview"));
  gameButton.addEventListener("click", () => select("game"));
  diagnosticsButton.addEventListener("click", () => select("diagnostics"));
  select("overview");

  root.append(header, nav, panels.overview, panels.game, panels.diagnostics);
}
