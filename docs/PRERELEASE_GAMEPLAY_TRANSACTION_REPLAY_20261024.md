# Vorrelease – Replay-Schutz innerhalb der Schreibtransaktion (24.10.2026)

**Basis:** PR #84, HEAD `42e6b953225d73d917db0866300b1bc86164a63a`. **Scope:** additive Verifikation im opt-in Gameplay-Schreiber und in der Gameplay-Session, Tests und CI. Keine Änderungen an eingefrorenen I07/I08/I10/I12-Modulen, Datenbankstruktur, Nutzerdaten, UI oder Evidence.

## Problem und Schutzwirkung

Bisher prüfte die Session den Weltlog vor dem Schreiben. Zwischen dieser Prüfung und der eigentlichen IndexedDB-Schreibtransaktion konnte ein anderer Schreiber einen gespeicherten Ereignisinhalt austauschen, ohne Sequenz oder Lamport-Zähler zu ändern. Der atomare Schreiber erkannte nur strukturelle Sequenz-/Duplikatfehler, aber keine fachlich gefälschten Spielereignisse.

Die Session übergibt nun `verify_history` als **synchrone** Verifikationsfunktion. Der atomare Schreiber liest den tatsächlichen Weltlog innerhalb seiner `readwrite`-Transaktion, prüft Sequenz und Lamport, übergibt **Kopien** des vorhandenen Logs und der geplanten Ereignisse an die Funktion und reiht erst nach `true` die Schreibvorgänge ein. Die Funktion replayt den kombinierten Ereignisstrom ab der unveränderten Anfangswelt und weist unzulässige Spielfolgen zurück. Rückgabe `false`, ein Promise, eine Exception oder ein manipulierter Verlauf führen zum Transaktionsabbruch; kein Teilzustand wird veröffentlicht.

Der direkte, bestehende opt-in Writer ohne `verify_history` bleibt kompatibel. **Wichtig:** Die generische I08-`append`-Schnittstelle existiert weiterhin und kann diesen Schutz umgehen. Das ist kein Single-Writer-Nachweis und keine produktive Freigabe. Ein umfassender Schutz erfordert ein kontrolliertes I08-/I10-REOPEN samt ausschließlicher Schreibhoheit.

## Regression und Freigabe

- Node: `node --test tests/gameplay_transaction_replay.test.mjs` prüft gültige Verifikation, fachlich manipulierte Alt-/Neuevents und ungültige Prüffunktionen.
- Chromium: `node tests/gameplay_session_cdp.mjs` prüft zusätzlich die Änderung eines gespeicherten Ereignisses **nach** der ersten Session-Prüfung, asynchrone Validatoren und Kopier-Isolation; bisherige Browserfälle laufen mit.
- Bestehende Gameplay-, I08- und I10-Regressionen und die 43-Pflichten-Matrix bleiben aktiv.
- CI-Ergebnis erst nach tatsächlichem GitHub-Lauf am endgültigen Commit eintragen. Kein vorweggenommenes PASS.
- Bekannter Gesamtqualitätsfehler `SSI-INT-0001` wegen I12-Fingerprints bleibt unverändert und darf nicht umgangen werden.

**Offene Release-Pflichten:** generischen I08-Append kontrolliert ablösen, autoritative Event-ID-Vergabe, vollständige Story-/Dialog- und End-to-End-Partien, Recovery/Migration/Stromausfall, 800×600/Zoom/Tastatur, Performance, Release-Dokumentation. Matrix unverändert: 43 Pflichten, 38 OPEN, 2 historische PASS, 3 DEFERRED; Kandidat 0/43. Persönliche Abnahme erst nach vollständigem technischem Freeze.

**Nächste Implementierung:** exklusiven Gameplay-Schreibpfad unter kontrolliertem Checkpoint einführen; parallele generische Writes abweisen und anschließend Crash-/Recovery-/Langzeitmessungen durchführen. Kein Merge und kein Release.
