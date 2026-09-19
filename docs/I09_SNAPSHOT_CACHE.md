# I09 - Snapshot Cache

## Verbindlicher Scope

I09 ergänzt ausschließlich einen **beschleunigenden, verwerfbaren Cache** für abgeleiteten Weltzustand.

- Snapshot schreiben,
- Snapshot gegen Welt, Ruleset-Version, Event-Fingerprint und Eventanzahl prüfen,
- fehlende, veraltete oder korrupte Snapshots verwerfen,
- bei jedem ungültigen Cache vollständig aus dem Eventlog replayen,
- Replay- und Cache-Readback-Zeit erfassen,
- Crash-/Abort-Sicherheit eines Snapshot-Replacements nachweisen.

**Das Eventlog bleibt die einzige fachliche Wahrheit.** Ein Snapshot darf niemals Events ersetzen, reparieren oder überschreiben.

## Persistenzmodell

Snapshots liegen in einer separaten IndexedDB-Datenbank `provoware-bunkersignale-snapshots`. Dadurch bleiben I08-Datenbankversion und Event-Store-Schema unangetastet.

Ein Snapshot enthält mindestens:

- `world_id`,
- `ruleset_version`,
- `event_fingerprint`,
- `event_count`,
- `state`.

Der `event_fingerprint` ist in I09 ein exakter, vom aufrufenden Eventlog-Kontext gelieferter Vergleichswert. I09 behauptet noch keine kryptografische Autorenketten- oder Signaturintegrität; diese Themen bleiben I11/I12.

## Harte Invarianten

1. Ein Snapshot mit falschem Fingerprint, falscher Ruleset-Version, falscher Eventanzahl oder ungültiger Struktur wird nie als Weltzustand verwendet.
2. Ungültige Snapshots werden aus dem Cache entfernt und führen zum vollständigen Replay.
3. Fehlende Snapshots führen ebenfalls zum vollständigen Replay.
4. Ein abgebrochener Snapshot-Write darf einen bereits gültigen Snapshot derselben Welt nicht ersetzen.
5. Replay-Fallback verändert den Event Store nicht.
6. Snapshot und Replay müssen denselben abgeleiteten Zustand liefern.
7. `resolveState()` schreibt nach Replay nicht automatisch zurück; Snapshot-Erzeugung bleibt eine explizite Operation.

## Großweltprofil

`tests/fixtures/snapshot/large-world-profile.json` definiert einen deterministischen 1000-Schritt-Replay-Smoke und konservative Zeitbudgets. Der reale Chromium-Gate erfasst:

- vollständige Replay-Zeit,
- Replay-Fallback-Zeit,
- Snapshot-Readback-Zeit.

Die Messwerte sind Regression-Smokebudgets, keine Hardwaregarantie.

## Non-Goals

- keine Quota-/Persistenzstatus-Ermittlung,
- kein Welt-Export oder Restore-Import (I10),
- keine Hashverkettung (I11),
- keine Signatur-/Crypto-Abstraktion (I12),
- keine Recovery-Startpipeline oder Event-Quarantäne (I13),
- kein Multi-Tab-Writer-Guard (I14),
- keine Gameplay- oder UI-Schreiblogik.

## Exit-Gates

1. fokussierte I09-Contract-Tests grün,
2. Repository Quality grün,
3. valider Snapshot liefert denselben Zustand wie vollständiger Replay,
4. Snapshot fehlt -> vollständiger Replay identisch,
5. falscher Fingerprint -> Snapshot wird verworfen -> vollständiger Replay identisch,
6. korrupter Snapshot -> Snapshot wird verworfen -> vollständiger Replay identisch,
7. Abort während Snapshot-Replacement -> letzter gültiger Snapshot bleibt lesbar,
8. 1000-Schritt-Großweltprofil bleibt innerhalb der dokumentierten Smoke-Budgets,
9. allgemeiner Chromium-Smoke bleibt grün,
10. finaler Diff enthält keine I10+-Funktion und keinen I08-REOPEN.

Verbindliche Gates: **G4 Persistenz/Recovery** und **G6 Integrität/Datenverlustschutz**.

## Freeze-Evidence

Validierter Produkt-/Teststand vor der reinen Evidence-Bindung: `64ae53555381621b7fcb4bddb65e5f6c86fcc5ec`, Basis `main` `89e21a2ffda87bd7325d23636d1b2d3449896930`.

Am 2026-09-19 waren für diesen unveränderten Head die triggerrelevanten GitHub-Actions grün:

- `snapshot-smoke`: success,
- `chromium-smoke`: success,
- Repository-Quality-Job `i00`: success.

Der Freeze bleibt bis zur grünen Wiederholung der durch diese Dokumentationsänderung ausgelösten relevanten Gates offen. Diese Evidence-Bindung ändert keine Produkt-, Persistenz-, Test- oder UI-Logik.

## Restrisiko

I09 prüft einen Snapshot gegen einen gelieferten Event-Fingerprint, definiert aber noch nicht dessen spätere kryptografische Herkunft. Speicherknappheit, Export/Restore, Multi-Tab-Schreibkoordination und umfassende Start-Recovery bleiben bewusst späteren Checkpoints vorbehalten.

## Nächster Schritt nach Freeze

Erst nach grünem I09-Freeze darf I10 auf einem frischen Branch Storage Health, Quota/Persistenzstatus und vollständigen Welt-Export/Restore behandeln.
