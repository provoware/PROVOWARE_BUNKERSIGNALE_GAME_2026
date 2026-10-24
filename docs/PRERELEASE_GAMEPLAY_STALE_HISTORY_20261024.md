# Vorrelease – gültige Verlaufsänderung zwischen Lesen und Schreiben (24.10.2026)

**Ausgangs-HEAD:** `7cc07119010e7669d2fe5f6e353386fa24c3f978` (Entwurfs-PR #85). **Umfang:** opt-in Gameplay-Session, Node-/Chromium-Negativtests, Prüftreiber, Änderungsnachweis und Pflichtmatrix. Keine Änderungen an I07/I08/I10/I12-Freeze, Signatur-Evidence, Nutzerdaten oder UI.

## Reproduzierbarer Fehler und Abhilfe

Die bisherige Transaktionsprüfung kontrollierte, ob die tatsächlich gespeicherten Ereignisse **fachlich gültig** waren. Ein zweiter Schreiber konnte jedoch einen ebenso gültigen alten Eintrag durch einen anderen ersetzen, ohne die Sequenz oder Lamport-Uhr zu verändern. Der neue Verlauf bestand Replay, obwohl die erste Lesephase auf einem anderen Verlauf basierte. Die Session konnte anschließend einen erfolgreichen Schreibvorgang mit einem veralteten zurückgegebenen Zustand quittieren.

Die Session speichert nach erfolgreichem Pre-Read eine **private, serialisierte Kopie des validierten Verlaufs**. Im synchronen Callback der IndexedDB-Schreibtransaktion muss die erneut gelesene Historie exakt übereinstimmen; ansonsten wird mit `GAMEPLAY_HISTORY_CHANGED` abgebrochen. Zusätzlich muss der erneut berechnete Folgezustand dem vorbereiteten Zustand entsprechen (`GAMEPLAY_RESULT_CHANGED`). Der öffentliche `read()`-Vertrag bleibt unverändert; kein neues Datenbankschema, keine neuen Abhängigkeiten und keine automatische Reparatur.

**Bewusste konservative Regel:** Unterschiedliche JSON-Eigenschaftsreihenfolgen können einen ansonsten gleichwertigen Verlauf ebenfalls ablehnen; es wird nie ein abweichender Verlauf still akzeptiert. Der Vergleich verarbeitet den vollständigen Weltlog und bleibt bis zur späteren Leistungsmessung ein O(n)-Speicher-/Zeitkostenpunkt.

## Prüfung und Nachweis

- Node: `node --test tests/gameplay_transaction_replay.test.mjs tests/gameplay_replay_session.test.mjs`; zwei neue Fälle: gültiger gleich langer Ereignisaustausch wird abgewiesen, unveränderter Verlauf bleibt zulässig.
- Echter Chromium-IndexedDB-Test: `node tests/gameplay_session_cdp.mjs`; ein zusätzlicher Fall ersetzt eine gültige Anfrage-ID bei unveränderter Sequenz/Lamport und prüft, dass **kein zweiter Eintrag** geschrieben und der alte nicht verändert wird. Soll: **16 Fälle**.
- Bestehende Gameplay-, I08-/I10- und Pflichtmatrix-Regressionen bleiben über den bestehenden PR-Workflow aktiv.
- Die tatsächlichen PASS/FAIL-Ergebnisse sind erst aus den GitHub-Läufen am finalen Branch-HEAD abzuleiten; diese Datei selbst behauptet kein Testergebnis.

## Offene Pflichten und Weiterarbeit

Dies ist **kein Single-Writer-Nachweis**: Der unveränderte generische I08-`append` kann weiterhin Ereignisse außerhalb der neuen Gameplay-Prüfung schreiben. Für exklusive Schreibhoheit ist ein gesondert dokumentiertes kontrolliertes I08-/I10-REOPEN samt Migrations-, Kompatibilitäts- und Rollbackprüfung nötig. Ebenfalls offen: I12-Fingerprintbindung durch den zuständigen Owner, vollständiger Story-/Dialoggraph, End-to-End-Partien, Crash/Restore, 800×600/Zoom/Tastatur, Performance und Release-Dokumentation.

**Vorrelease-Matrix:** 43 Anforderungen; 38 OPEN, 2 nur historische PASS, 3 persönliche DEFERRED; **0/43** für einen eingefrorenen Kandidaten. `technical_ready=false`, `release_ready=false`, `release_approved=false`. Keine persönlichen Prüfungen vor dem technischen Freeze; kein Merge und kein Release.
