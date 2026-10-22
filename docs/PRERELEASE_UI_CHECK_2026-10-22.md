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

Der neue Chromium-Test wurde auf dem Entwicklungszweig gespeichert. Die Erstellung einer **neuen GitHub-Workflow-Datei** wurde durch die Schreibschnittstelle blockiert; diese Datei wurde nicht angelegt. Deshalb ist ein automatischer Browserlauf fuer den neuen Test noch **nicht** nachgewiesen. Ein statischer Vertragstest ist kein Ersatz fuer einen echten Chromium-Lauf.

`UX-02`, `A11Y-01` und `AUTO-03` bleiben in der Pflichtmatrix OPEN. Sie duerfen erst nach einem erfolgreichen, SHA-gebundenen echten Browserlauf und den zusaetzlich erforderlichen Pruefungen auf PASS gesetzt werden.

**Naechste Implementation:** Browserpruefung regulaer in CI integrieren, fehlgeschlagene Browserfaelle auf einem getrennten, sicheren Arbeitspaket beheben, anschliessend Story-/Command-Vertraege fuer GAME-01 bis GAME-04 spezifizieren. Keine Zusammenfuehrung, keine Freigabe, kein Release.
