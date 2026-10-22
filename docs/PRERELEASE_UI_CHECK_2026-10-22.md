# Vorrelease-UI: technischer Browser-Pruefvertrag (22.10.2026)

**Spiel:** S.O.U.N.D. SYSTEM-IKER / Bunkersignale. **Status:** OPEN, nicht vorrelease-fertig.

## Ausgangslage und abgegrenzter Umfang

- Baseline: main `f36d36c8051db98e69a869646d8d6bae6db074ef`; urspruenglicher Prerelease-Zweig: `0c329d26122ef406cd115efd70f51a4b4ed33a28`.
- Entwurfs-PR: https://github.com/provoware/PROVOWARE_BUNKERSIGNALE_GAME_2026/pull/77
- Andere laufende Arbeit: PR #76 (I12-Signatur-Persistenz); kein Eingriff in I12-Code, I12-Evidence oder Status.
- Produkt-Runtime, I10-Freeze, persistente Nutzerdaten und die Vorrelease-Pflichtmatrix bleiben unveraendert.

## Technischer Nachweis

`tests/prerelease_ui_smoke.mjs` prueft mittels Chrome-Debugschnittstelle:

1. Start der realen lokalen Browseroberflaeche und unbehandelte JavaScript-Ausnahmen.
2. CSS-Viewports 800x600 und 400x300; horizontales Ueberlaufen, sichtbare Spielansicht, Fokus und einspaltiges Raster.
3. Tab-Reihenfolge, sichtbaren Fokus und Aktivierung mit Eingabetaste.
4. Weiterhin vier deaktivierte Spielaktionen ohne aktive Weltmutation.

`tests/test_prerelease_ui_contract.py` enthaelt zusaetzlich statische Negativ-/Vertragspruefungen, die ueber den regulaeren Quality-Testlauf entdeckt werden.

**Wichtig:** 400x300 ist lediglich eine technische Naeherung fuer 200 % vergroesserten Inhalt. Ein realer Kubuntu-Skalierungstest und die persoenliche Sichtabnahme finden erst am Ende statt.

## Aktuelle Blockade und Freigaberegel

Der vorhandene Chromium-Workflow `i10-game-ui-shell-smoke.yml` startet nun zusaetzlich `node tests/prerelease_ui_smoke.mjs`, ohne eine neue Workflow-Datei anzulegen. Der statische Vertragstest erzwingt diese Einbindung. **Ein PASS ist erst nach tatsaechlich erfolgreichem GitHub-Browserlauf fuer den konkreten HEAD zulaessig.** Die Vorrelease-Pflichten UX-02, A11Y-01 und AUTO-03 bleiben bis dahin OPEN. Die allgemeine Quality-CI kann unabhaengig wegen des noch nicht neu gebundenen I12-Fingerprints scheitern; das ist kein bestandener Gate.

`UX-02`, `A11Y-01` und `AUTO-03` bleiben in der Pflichtmatrix OPEN. Sie duerfen erst nach einem erfolgreichen, SHA-gebundenen echten Browserlauf und den zusaetzlich erforderlichen Pruefungen auf PASS gesetzt werden.

**Naechste Implementation:** Echten Chromium-Prueflauf auswerten, fehlgeschlagene Browserfaelle auf einem getrennten, sicheren Arbeitspaket beheben, anschliessend Story-/Command-Vertraege fuer GAME-01 bis GAME-04 spezifizieren. Keine Zusammenfuehrung, keine Freigabe, kein Release.
