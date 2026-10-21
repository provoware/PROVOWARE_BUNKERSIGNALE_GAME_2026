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
