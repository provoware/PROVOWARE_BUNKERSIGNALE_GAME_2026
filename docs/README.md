# Dokumentationsindex

Die Dokumentation ist nach Verbindlichkeit getrennt. Bei Widersprüchen haben maschinenlesbare Verträge und ausdrücklich normative Dokumente Vorrang vor historischen Referenzen.

## Einstieg

1. `../README.md` – Projektstatus, Schnellstart und Repository-Übersicht.
2. `ARCHITECTURE.md` – Schichten, Importgrenzen und State-Ownership.
3. `DEVELOPMENT_RULES.md` – Änderungsdisziplin, Freeze/REOPEN und Versionierung.
4. `REGRESSION_POLICY.md` – Qualitäts- und Regressionserwartungen.

## Normative Dokumente

- `ARCHITECTURE.md`
- `DEVELOPMENT_RULES.md`
- `GLOBAL_STANDARDS.md`
- `ERROR_HANDLING.md`
- `REGRESSION_POLICY.md`
- `CHANGE_CONTROL.md`
- `QUALITY_GATES.md`
- `SUBAGENT_PROTOCOL.md`

## Checkpoint-Dokumente

- `I07_PURE_REDUCER.md` – deterministischer Replay-Core.
- `I08_INDEXEDDB_EVENT_STORE.md` – transaktionaler Event Store und Readback.
- `I09_SNAPSHOT_CACHE.md` – verwerfbarer Snapshot Cache und Replay-Fallback.
- `I10_GAME_UI_REGRESSION_SHELL.md` – read-only Spieloberfläche als I10-P0 Regressionsreferenz.
- `I10_STORAGE_HEALTH_EXPORT_BACKUP.md` – verbindlicher I10-Kernvertrag für Storage Health, Export Backup und Restore.

## Architekturentscheidungen

- `decisions/ADR-0001-baseline-architecture.md`

## Maschinenlesbare Verträge

Sie liegen außerhalb von `docs/`:

- `../manifests/`
- `../schemas/`
- `../agents/`

## Nachweise

- `../changes/` – Change Records
- `../evidence/` – eingefrorene Evidence
- `../status/` – maschinenlesbarer Checkpointstatus

## Historische Referenzen

`reference/` enthält Ausgangs- und Arbeitsanweisungen. Diese Dateien dokumentieren Herkunft und Zielbild, sind aber **nicht automatisch der aktuelle Implementierungsstand**.
