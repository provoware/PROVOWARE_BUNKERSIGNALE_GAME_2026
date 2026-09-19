# I08 – IndexedDB Event Store

## Verbindlicher Scope

I08 liefert ausschließlich den persistenten Event-Store der P1-Phase:

- transaktionaler Append von einem oder mehreren Events,
- eindeutiger Primärschlüssel `event_id`,
- Indizes für Weltzugriff und deterministischen Welt-/Lamport-Readback,
- Reopen/Readback aus einer neu geöffneten Store-Instanz,
- fail-closed Verhalten bei Duplicate/Constraint-Fehlern,
- Crash-/Abort-Nachweis: entweder die gesamte Transaktion oder kein Event wird sichtbar.

Die Masterplanung fordert für I08 ausdrücklich transaktionalen Append, Indizes und Readback sowie G2/G4/G6. Die Härtung fordert zusätzlich einen simulierten Abbruch zwischen Writes; nach Neustart darf nur ganz oder gar nicht sichtbar sein.

## Non-Goals

- keine Snapshots oder Snapshot-Wahrheit (I09),
- keine Storage-Quota-/Export-Funktion (I10),
- keine Hashverkettung oder Signaturen (I11/I12),
- keine Änderungen am eingefrorenen I07-Reducer,
- keine Gameplay- oder UI-Schreiblogik.

## Persistenzinvariante

Ein `append(events)` ist atomar. Bei Abort oder Constraint-Fehler darf kein Teil der fehlgeschlagenen Batch sichtbar werden. Bereits vorher erfolgreich gespeicherte Events bleiben unverändert.

## Implementierung

`app/infrastructure/browser/indexeddb-event-store.js` kapselt IndexedDB hinter `createIndexedDbEventStore`. Die Weltzuordnung wird als Storage-Metadatum neben dem unveränderten I06-Event-Envelope gespeichert; `append(worldId, events)` verändert den Envelope-Vertrag nicht. Synchrone Queue-/Clone-Fehler abortieren die aktive Transaktion explizit, bevor der Fehler weitergegeben wird. Bereits mit der ersten I08-Fassung gespeicherte rohe v1-Records werden beim Readback kompatibel erkannt; ihr historisches `world_id`-Storagefeld wird entfernt, bevor der unveränderte Event-Envelope zurückgegeben wird. `faultInjector` ist ausschließlich ein injizierbarer Fault-Hook für deterministische Crash-/Abort-Prüfung; ohne Injektion existiert kein künstlicher Fehlerpfad.

## Exit-Gates

1. fokussierte I08-Contract-Tests grün,
2. Repository Quality grün,
3. realer Chromium-Test: erfolgreicher Append + Reopen/Readback,
4. realer Chromium-Test: Abort nach erstem Write → null sichtbare Events,
5. Duplicate-Batch → vollständiger Rollback,
6. synchroner Queue-/Clone-Fehler nach bereits gequeued Write → vollständiger Rollback,
7. gespeicherte Weltzuordnung bleibt Storage-Metadatum; gültige I06-Envelopes bleiben unverändert,
8. bereits persistierte I08-v1-Raw-Records bleiben lesbar und werden als unveränderte Event-Envelopes zurückgegeben,
9. finaler Diff enthält keine I09+-Funktion und keinen I07-REOPEN.

Erst nach vollständig grünen Gates darf I08 eingefroren und gemergt werden.

## Restrisiko

I08 beweist noch keine Quota-Recovery, Snapshot-Wiederherstellung, Multi-Tab-Sperre oder kryptografische Integrität. Diese Fähigkeiten bleiben bewusst späteren Checkpoints vorbehalten.
