# Vorrelease-Pflichtmatrix – S.O.U.N.D. SYSTEM-IKER

**Bestandsaufnahme:** 22.10.2026. **Baseline:** `f36d36c8051db98e69a869646d8d6bae6db074ef` (`main`, 28.09.2026). **Release-Status:** NICHT BEREIT.

## Geltungsbereich und Wahrheit

Die maschinenlesbare Einzelpflichtenliste ist [`prerelease_matrix.json`](prerelease_matrix.json). Sie führt 43 konkret erkennbare Anforderungen aus README, AGENTS, I00–I12, I10-Spielansicht und Visual-World-Masterplan. Ein **PASS** in dieser Datei bezieht sich ausschließlich auf die angegebene historische SHA und den konkret verlinkten GitHub-Prüflauf. Ein historischer PASS ist **kein** Beleg für einen neuen Release-Kandidaten. Fehlende Spiellogik und fehlende vollständige Durchläufe sind ausdrücklich offen.

Die Projektversion ist `0.1.0-alpha.0`. Die aktuelle Spielansicht ist eine **schreibgeschützte Regressionsoberfläche**; ihre vier Aktionen sind absichtlich deaktiviert. I12-Signaturfunktionen sind teilweise technisch vorhanden. Die Aussage im README, I12 enthalte keinen Runtime-Code, ist nach dem geprüften Dateibaum veraltet und wird als Dokumentationspflicht erfasst; dieser Arbeitsschritt verändert die bestehende Produktdokumentation nicht.

## Prüfstatus und Freigaberegel

`python3 tools/prerelease_gate.py` validiert Pflicht-IDs, Kategorien, Status, GitHub-Nachweislinks und 40-stellige SHA-Angaben. Der Befehl prüft **nicht** die Wahrheit hinter fremden URLs. Das übernehmen die tatsächlichen Tests und die PR-CI. `python3 tools/prerelease_gate.py --require-technical-ready` liefert bei offenen technischen Pflichten absichtlich Fehlercode 2. `--require-release-ready` verlangt zusätzlich sämtliche persönlichen Abnahmen und `release_approved=true`.

Die Statuswerte bedeuten: `PASS` = für die eingetragene SHA mit Link belegt, `OPEN` = ausstehende Implementierung/Prüfung, `FAIL` = nachgewiesener Fehler, `BLOCKED` = externe Blockade mit nächster Arbeit, `DEFERRED` = ausschließlich persönliche Endabnahme nach technischem Freeze. `candidate_sha=null` und beide Ready-Werte `false` sind verbindlich, solange kein Kandidat vollständig geprüft ist.

## Unabhängige Prüfbarkeit

`tests/test_prerelease_matrix.py` enthält Negativtests gegen doppelte IDs, fehlende Kategorien, falsche Freigabewerte und PASS ohne Evidence. Der PR-Workflow `.github/workflows/prerelease-matrix-audit.yml` prüft diese Vertragsregeln zusätzlich zur regulären Repository-Quality. Die Matrix-Gates sind **keine** Behauptung, dass Gameplay, 800×600, 175–200 % Skalierung oder Tastatur bereits praktisch geprüft seien.

Die echten Browserprüfungen für 800×600, Tastatur-Tabfolge, sichtbaren Fokus und 200-%-Näherung sind als `UX-02`, `A11Y-01` und `AUTO-03` offen. Die 400×300-CSS-Viewport-Prüfung kann nur eine Näherung sein und ersetzt keinen Betriebssystem-Skalierungstest.

## Freigabegrenzen und nächstes Pflichtpaket

Die aktuell offenen Kernblöcke sind echte Spielaktionen, Story-/Ortsgraph, Figuren-/Inventarzustände, vollständige Spielverläufe, Save/Restore im Vollspiel, Weltgrafik, 800×600/Zoom- und Tastaturprüfung, Performance, Paketierung und Dokumentation. Der nächste fachliche Entwicklungsschritt ist **GAME-01 bis GAME-04**: zunächst einen versionsgebundenen Command-/Event-Vertrag für die vier heute deaktivierten Spielaktionen und dazu deterministische Negativ-/Replay-Tests spezifizieren; die I10-Read-only-Oberfläche erst nach einem ausdrücklich dokumentierten REOPEN und grünem Regressionstest verändern.

**Bekannte Integrationsblockade:** Der noch offene PR #76 schreibt ebenfalls `evidence/I12_EVIDENCE.json` und `status/I12_STATUS.json`. Diese Dateien bleiben in diesem Branch bewusst unangetastet (Single Writer). Wegen des SHA-gebundenen I12-Fingerprints ist die allgemeine Quality-CI bis zur konfliktfreien Evidence-Bindung erwartbar rot; ein roter Gate wird nicht abgeschwächt. Da hier kein vollständiger lokaler Git-Checkout möglich ist, wird die exakte Fingerprint-Abweichung erst aus den Remote-Gates ausgewertet.\n\n**Schutzgrenzen:** kein Merge, kein Release, kein Schutz-Bypass, kein Überschreiben von Nutzerdaten. PR #76 bearbeitet I12-P3; dieser Vorrelease-Block greift dort nicht ein. Persönliche Sichtprüfung, Kubuntu-Test und finale Freigabe folgen ausschließlich gesammelt nach technischem Freeze.

## 23.10.2026 – Schutz der Pflichttexte (nicht release-freigebend)

Die 43 ursprünglichen Pflichttexte sind zusätzlich zu ID, Kategorie und Phase
als lesbarer Referenzkatalog in `tools/prerelease_requirements.py` hinterlegt.
Eine stille Abschwächung oder Umformulierung in der JSON-Matrix wird als FAIL
abgewiesen. Bewusst geänderte Anforderungen müssen mit nachvollziehbarer
Begründung in einem gesondert geprüften Änderungsnachweis und beiden Dateien
gleichzeitig geändert werden. Zusätzliche Pflichten bleiben möglich.
Negativtests verändern jede der 43 Anforderungen einzeln und prüfen außerdem
ungültige JSON-Datentypen (fail-closed, ohne ungefangenen Programmfehler).

Dies ist ausschließlich eine Absicherung der Release-Prüfung: Die 43 Pflichten
sind dadurch nicht fachlich erfüllt. I12-Fingerprint/Quality, echte
Chromium-Läufe, Gameplay und Endabnahme bleiben separat offen.

## 24.10.2026 – transaktionaler Gameplay-Replay-Schutz (CHG-20261024-004)

Die optionale Gameplay-Session verifiziert den echten Ereignisstrom jetzt **innerhalb** der IndexedDB-Schreibtransaktion, statt ausschließlich vor dem Schreiben. Fachlich gefälschte Ereignisse mit unveränderter Sequenz/Lamport-Uhr, asynchrone Prüffunktionen und manipulierte Schreibvorschläge werden abgewiesen. Nachweise und verbleibende Grenzen: [Transaktions-Replay-Prüfvertrag](PRERELEASE_GAMEPLAY_TRANSACTION_REPLAY_20261024.md).

**Release-Zählung bleibt 0/43** (38 OPEN, 2 nur historische PASS, 3 persönliche DEFERRED). Die generische I08-Schreibschnittstelle ist weiterhin unabhängig erreichbar, daher bleibt `SCOPE-01`/Single Writer offen. I12-Integritätsbindung und Gesamt-Quality sind weiterhin rot, bis die zuständige formale Checkpoint-Arbeit abgeschlossen ist. Keine Produktfreigabe oder persönliche Endabnahme.

## 24.10.2026 – gültiger, aber ausgetauschter Weltverlauf (CHG-20261024-005)

Die Gameplay-Session bindet die transaktionale Replay-Prüfung jetzt an **genau den vorher gelesenen und erfolgreich validierten Ereignisverlauf**. Auch wenn ein anderer Schreiber einen fachlich gültigen Eintrag mit identischer Sequenz und Lamport-Uhr austauscht, darf die Session nicht mit einem veralteten Ergebnis fortfahren. Der neue Prüfvertrag ist in [PRERELEASE_GAMEPLAY_STALE_HISTORY_20261024.md](PRERELEASE_GAMEPLAY_STALE_HISTORY_20261024.md) dokumentiert.

Die 43 Pflichten bleiben unverändert: 38 OPEN, 2 nur historisch PASS, 3 DEFERRED, Kandidat **0/43**. Der generische I08-Schreiber ist weiterhin separat erreichbar, daher besteht **keine** exklusive Schreibhoheit. I12-Fingerprint/Quality bleibt bis zum formal zuständigen Checkpoint gesperrt. Keine persönliche Abnahme, kein Merge, kein Release.
