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
  const heading = element(documentRef, "h2", { text: "System bereit für I01" });
  const copy = element(documentRef, "p", {
    text: "Diese Iteration stellt nur den sicheren Startpfad und die technische Diagnose bereit. Spiellogik und persistente Weltdaten sind noch nicht aktiv.",
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

function renderDiagnostics(documentRef, snapshot, onRefresh) {
  const section = element(documentRef, "section", { className: "ssi-panel" });
  section.id = "diagnostics-panel";
  section.tabIndex = -1;
  section.hidden = true;
  const heading = element(documentRef, "h2", { text: "Diagnose & Recovery" });
  const intro = element(documentRef, "p", {
    text: "Die Diagnose liest nur Fähigkeiten und Status. I01 verändert, repariert oder löscht keine Weltdaten.",
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

export function renderApp(root, snapshot, { onRefresh }) {
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
  const diagnosticsButton = element(documentRef, "button", { className: "ssi-tab", text: "Diagnose & Recovery" });
  overviewButton.type = diagnosticsButton.type = "button";
  overviewButton.setAttribute("aria-pressed", "true");
  diagnosticsButton.setAttribute("aria-pressed", "false");
  nav.append(overviewButton, diagnosticsButton);

  const overview = renderOverview(documentRef, snapshot);
  const diagnostics = renderDiagnostics(documentRef, snapshot, onRefresh);

  function select(panel) {
    const showDiagnostics = panel === "diagnostics";
    overview.hidden = showDiagnostics;
    diagnostics.hidden = !showDiagnostics;
    overviewButton.setAttribute("aria-pressed", String(!showDiagnostics));
    diagnosticsButton.setAttribute("aria-pressed", String(showDiagnostics));
    (showDiagnostics ? diagnostics : overview).focus?.();
  }

  overviewButton.addEventListener("click", () => select("overview"));
  diagnosticsButton.addEventListener("click", () => select("diagnostics"));

  root.append(header, nav, overview, diagnostics);
}
