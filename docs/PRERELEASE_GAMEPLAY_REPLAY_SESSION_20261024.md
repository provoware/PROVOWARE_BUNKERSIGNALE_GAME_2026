# Vorrelease – deterministischer Gameplay-Replay und opt-in Session (24.10.2026)

**Basis:** PR #83, HEAD `60bba721b9ed1a4ff15dacce5a8281389e39ece9`. **Scope:** nur additive Gameplay-Domain-/Application-Module, ein read-only Snapshot-Validator-Export, Tests, CI und diese Dokumentation. I07/I08/I10/I12 eingefrorene Dateien, vorhandene Speicherstände und die Benutzeroberfläche bleiben unverändert.

## Verbindlicher Ablauf

1. `replayGameplayEvents(initialState, events)` erzeugt einen vollständigen Spielzustand ausschließlich aus einer validierten Anfangswelt und dem unveränderten I06-förmigen Eventstrom. Die vier bekannten Aktionen werden mit dem bestehenden `projectGameplayCommand` erneut fachlich entschieden. Unbekannte Ereignisse, falsche Ziele, unzulässige Dialoge, fehlende/zusätzliche Felder, fremde Autoren, Sequenz-/Lamport-Lücken, doppelte Anfragen und ungültige Payloads schlagen ohne Teilzustand fehl.
2. `createGameplaySession({eventStore,appender,initialState})` liest vor jeder Aktion die **tatsächlich gespeicherte** Welt, führt den deterministischen Replay aus, erzeugt einen Eventstapel und übergibt ihn mit erwarteter Sequenz/Lamport-Uhr an den atomaren Schreiber aus PR #83. Bei Fehlern wird kein vorgeschlagener Zustand veröffentlicht. Die Event-IDs sind vom aufrufenden Vertrauensbereich vorzugeben; der Schreiber erzwingt globale Eindeutigkeit.
3. Kein UI-Import, keine produktive Aktivierung, keine neue Datenbankversion, kein stilles Reparieren alter Weltlogs. Die I10-Regression-Shell bleibt read-only. Die vorhandene generische I08-Schreibschnittstelle kann die Gameplay-Schutzregeln noch umgehen; **Single Writer ist deshalb nicht nachgewiesen**.

## Sicherheits- und Leistungsgrenzen

Die Replay-Implementierung akzeptiert ausschließlich einen vollständig gültigen Anfangszustand mit Sequenz null und ohne bereits bearbeitete Anfragen. Events müssen genau die neun vorgesehenen I06-Felder besitzen; Metadata ist aktuell leer. Lamport beginnt für diese Gameplay-Welten bei eins und wächst lückenlos. Historische Fremdformate werden nicht still migriert. Maximal 10.000 Ereignisse pro Replay und ein begrenzter JSON-Datenbaum verhindern unbegrenzte Verarbeitung; eine gemessene Leistungszusage für lange Partien fehlt. Die bestehende atomare Schreibkomponente liest weiterhin den vollständigen Weltlog pro Schreibvorgang. Nicht unterstützte Eventarten und unbekannte Contentversionen bleiben blockiert.

**Noch offen:** zentrale alleinige Schreibhoheit, fachliche Integrität auch bei parallelen generischen I08-Schreibern, Crash-/Recovery-Prüfungen nach Stromausfall, vollständiger I06-Schema-Nachweis über alle optionalen Felder, Snapshot-Migration, End-to-End-Story, vollständige Partien, echte Browser-Zoomprüfung und formaler I10-REOPEN. Diese Implementierung ist eine additive, noch nicht freigegebene Gameplay-Vorstufe.

## Prüfvertrag und Evidence

- Node: `node --test tests/gameplay_replay_session.test.mjs` – 14 Prüfgruppen, einschließlich Negativ-/Tamper-/Idempotenz- und Read-before-write-Fällen.
- Bestehende Gameplay-Tests und I08/I10-Freeze-Regressionsprüfungen laufen unverändert.
- Echter Chromium: `node tests/gameplay_session_cdp.mjs` – 12 Fälle: vier Spielaktionen, Reload/Replay, doppelte Anfragen, Konkurrenz, Transaktionsabbruch, veralteter Befehl, gefälschter Log und Welttrennung.
- GitHub-Workflow `.github/workflows/prerelease-gameplay-replay-session.yml` führt diese Prüfungen getrennt aus. **PASS gilt erst nach erfolgreichem Lauf auf dem tatsächlichen finalen HEAD.**
- `docs/prerelease_matrix.json` bleibt normativ: 43 Pflichten, 38 OPEN, 2 historische PASS, 3 persönliche DEFERRED; 0/43 für den Kandidaten belegt. `candidate_sha=null`, `technical_ready=false`, `release_ready=false`, `release_approved=false`.
- Das bekannte `SSI-INT-0001`-Quality-FAIL wegen nicht gebundener I12-Fingerprints bleibt bewusst bestehen; keine Evidence- oder Statusdatei wird überschrieben.

**Nächste Implementierung:** Gameplay-Session als einzigen autorisierten Schreibpfad durchsetzen (I08/I10 kontrolliert per Checkpoint öffnen), transaktionale Prüfung der Replay-Integrität vor jedem Append, vollständige Recovery- und Performancefälle; I12-Bindung nur im eigenen formalen Checkpoint reparieren.

**Kein Merge, kein Release, keine persönliche Endabnahme vor vollständig grünen technischen Gates und eingefrorenem Vorrelease-Kandidaten.**
