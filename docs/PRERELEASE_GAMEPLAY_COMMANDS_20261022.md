# Vorrelease: Spielfunktions-Vertrag GAME-01 bis GAME-04 (Entwurf)

Stand: 22.10.2026. Entwicklungszweig: `agent/prerelease-gates-20261022`, Ausgangs-HEAD `41e6140f7958280168d6053a1daae3c7304b6f99`. Bezug: [Pflichtmatrix](prerelease_matrix.json), [I07](I07_PURE_REDUCER.md), [I10](I10_GAME_UI_REGRESSION_SHELL.md), [Spielwelt](VISUAL_WORLD_MASTERPLAN.md). **Status: OPEN – ausschließlich Vertragsplanung, keine Implementierung und kein PASS.**

## Ausgangslage und Schutzgrenzen

Die vier sichtbaren Aktionen `Untersuchen`, `Reden`, `Inventar`, `Weiter` sind in `app/application/game-shell.js` nur eingefrorene Beschriftungen und in `app/ui/app.js` ausdrücklich deaktiviert. Das ist aktuell korrekt: Es gibt keine aktive Spiellogik. Der I10-Read-only-Freeze, I07-Reducer, I08-Eventlog, I12-Signaturen und PR #76 werden in diesem Arbeitspaket **nicht** geändert. Eine Aktivierung setzt einen eigenen, dokumentierten REOPEN mit grünen Regressionen voraus.

## Vorgeschlagener einheitlicher Befehlspfad

`UI -> validateCommand(command, worldSnapshot, ruleset) -> decision(events | error) -> atomic event append -> deterministic replay -> read-only projection`.

Ein Befehl ist zunächst nur eine **Absicht**, kein Event und keine sofortige Weltmutation. Der Entscheidungsweg erhält explizit `world_id`, `actor_id`, `action`, `target_id`, `expected_sequence`, `ruleset_version` und `request_id`; keine implizite Uhrzeit, kein Zufall, keine Netzwerkdaten. Fehlende/zusätzliche Felder, unbekannte IDs, Versionsabweichung, veraltete Sequenz und nicht erlaubte Aktionen werden **vor** Persistenz abgewiesen. Events nutzen anschließend ausschließlich den bestehenden I06-Envelope-Vertrag. `request_id` ist für Wiederholungs-/Doppelklickschutz vorgesehen; sein genauer Speicherort wird erst mit dem zuständigen Event-Store-Owner festgelegt. Der Befehlspfad darf niemals einen teilweise geänderten Zustand zurückgeben.

| Pflicht | Fachliche Vorbedingung | Erfolgsfolge | Pflicht-Negativtest |
| --- | --- | --- | --- |
| GAME-01 Untersuchen | Ziel existiert, liegt im aktuellen Sektor, ist untersuchbar | untersuchte Spur und freigegebene Information erscheinen deterministisch im Replay | nicht erreichbares/unbekanntes Ziel erzeugt **kein** Event |
| GAME-02 Reden | Gesprächspartner anwesend; gewählte Dialogoption im aktuellen Knoten erlaubt | Auswahl, Folgeknoten und ggf. freigeschaltete Information sind replaybar | doppelte oder veraltete Auswahl erzeugt **kein** zweites Event |
| GAME-03 Inventar | Objekt im erlaubten Bereich; Kapazität/Besitz/Nutzbarkeit erfüllt | Aufnahme/Verwendung verändert Inventar ausschließlich über Events | nicht vorhandenes, fremdes oder schon verbrauchtes Objekt bleibt unverändert |
| GAME-04 Weiter | Kante im versionierten Ortsgraph vorhanden; Zugangsvoraussetzungen erfüllt | aktueller Sektor wechselt, Rückweg und erlaubte Aktionen werden neu projiziert | gesperrter/nicht existierender Sektor und veraltete Sequenz werden abgewiesen |

## Erste deterministische Prüfszenarien

1. **Null-Event:** gleicher Anfangszustand und leeres Eventlog ergeben denselben Anfangssektor, dasselbe Inventar und denselben Dialogknoten.
2. **Vollständiger Minimalweg:** Start in `Sektor Null` -> `Untersuchen` einer zugänglichen Spur -> `Reden` mit erreichbarer Figur -> `Inventar` aufnehmen/prüfen -> `Weiter` entlang einer zulässigen Kante -> Rückweg; Replay nach jedem Schritt ist identisch.
3. **Sperrfall:** Jede der vier Aktionen mit unbekanntem Ziel, falschem Ruleset, veralteter Sequenz und doppelter `request_id` verweigern; Eventanzahl, letzte Sequenz, Inventar und Ort bleiben bytegleich.
4. **Speicherfehler:** Event-Append schlägt vor Commit fehl; nach Wiederanlauf ist entweder der alte vollständige Zustand vorhanden oder die bestätigte vollständige Transaktion, niemals ein Zwischenzustand.
5. **Grenzfälle:** Inventar voll, Dialogoption nicht freigeschaltet, Ziel aus anderem Sektor, Sackgasse im Ortsgraph, 1000 Events und wiederholte identische Replays.
6. **UI-Freigabe:** Tab/Enter/Fokus, 800 × 600 und 400 × 300 ohne horizontales Scrollen; die Spielaktionen werden erst nach grünem Domain- und Persistenzgate einzeln aktiviert.

## Verbindliche Implementierungsreihenfolge

**A:** Versionierte Welt- und Aktionsfixtures samt eindeutigen Ziel-IDs und erlaubten Übergängen definieren; Produkt- und Schema-Owner bestimmen. **B:** Fail-closed Befehlsvalidator und Negativtests als eigenständigen Gameplay-Checkpoint entwickeln, ohne I10 zu ändern. **C:** Ereignisentscheidung und deterministischen Replay samt Crash-/Duplicate-Tests integrieren. **D:** Erst nach grüner Gesamtkette I10 formal REOPEN, UI schrittweise anbinden und vollständige Durchläufe automatisieren. Keine persönliche Endabnahme vor eingefrorenem Release-Kandidaten.

## Aktueller CI-Befund (getrennt vom Gameplay)

GitHub-Quality auf HEAD `41e6140f7958280168d6053a1daae3c7304b6f99`: [Lauf 39749047373](https://github.com/provoware/PROVOWARE_BUNKERSIGNALE_GAME_2026/actions/runs/39749047373) **FAIL**, konkret `SSI-INT-0001` wegen veraltetem I12-Evidence-Fingerprint, fehlendem Hash für `changes/CHG-20261022-001.json` und veraltetem I12-Status-Fingerprint. [Matrix-Lauf 39749047368](https://github.com/provoware/PROVOWARE_BUNKERSIGNALE_GAME_2026/actions/runs/39749047368) **PASS**, aber **kein** Gameplay- oder Chromium-Nachweis. Die I12-Dateien gehören zur parallelen Arbeit an PR #76; nicht fremd überschreiben. Die Chromium-Integration in den bestehenden I10-Workflow wurde durch die Schreibschnittstelle blockiert. `UX-02`, `A11Y-01`, `AUTO-03` bleiben OPEN.

**Freigabestatus:** Kein Gameplay implementiert, keine Pflicht als PASS hochgestuft, kein Merge, kein Release.
