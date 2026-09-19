# I10-P0 - Game UI Regression Shell

## Zweck

Dieser Vorblock eröffnet I10 technisch, implementiert aber bewusst **noch keine Storage-Health-, Quota-, Export- oder Restore-Funktion**. Er schafft zuerst eine stabile, sichtbare und read-only Spieloberfläche als Referenz für Browser-, Layout-, Fokus- und Accessibility-Regressionen.

I09 bleibt eingefroren. Die Spielansicht liest keine Event- oder Snapshot-Datenbank und erzeugt keine Commands oder Events.

## Verbindlicher Scope

- dritter Hauptbereich `Spiel` neben `Übersicht` und `Diagnose & Recovery`,
- festes Application-ViewModel `createGameShellSnapshot()`,
- sichtbare Regionen für Figuren, Szene, Details und Ereignis/Log,
- vier spätere Spielaktionen als vollständig deaktivierte Buttons,
- klare Kennzeichnung `Read-only · keine Weltmutation`,
- responsive Einspalten-Darstellung auf schmalen Viewports,
- eigener realer Chromium-Regressionsgate.

## Architekturgrenze

`app/application/game-shell.js` ist ein statisches, eingefrorenes ViewModel ohne Browser- oder Storage-Abhängigkeit.

`app/bootstrap/main.js` verdrahtet dieses ViewModel mit der UI. `app/ui/app.js` rendert ausschließlich Darstellung und lokale Tab-Navigation. Es gibt keinen Import von UI nach Infrastructure und keinen Schreibpfad in Event Store oder Snapshot Cache.

## Non-Goals

- keine Spielregeln,
- keine Weltmutation,
- keine Commands oder Events,
- keine Event-Store-/Snapshot-Schreibzugriffe,
- keine Storage-Quota- oder Persistenzstatus-Ermittlung,
- kein Export/Restore,
- keine Hashkette oder Kryptografie,
- keine Canon-/Content-Erweiterung.

## Regressionsvertrag

Der dedizierte Chromium-Smoke prüft:

1. App bootet ohne Runtime-Exception,
2. der Tab `Spiel` ist vorhanden und aktivierbar,
3. `#game-panel` wird fokussiert und trägt den Marker `data-regression-surface="game-shell"`,
4. die Read-only-Kennzeichnung ist sichtbar,
5. exakt vier Aktionsbuttons sind vorhanden und alle deaktiviert,
6. Desktop-Layout verursacht keinen horizontalen Overflow,
7. bei 640 px Viewportbreite kollabiert das Game-Grid auf genau eine Spalte und bleibt overflow-frei.

Der allgemeine Browser-Smoke bleibt zusätzlich aktiv.

## Genau eine visuelle UX-Verfeinerung

Zusätzlich zur strukturell notwendigen Game-Shell erhält ausschließlich die zentrale Szenenfläche eine Akzentkante über `.ssi-scene-card`. Keine weitere dekorative Designänderung gehört zu diesem Vorblock.

## Exit des P0-Vorblocks

P0 ist abgeschlossen, wenn Unit-/Repository-Quality, allgemeiner Chromium-Smoke und `i10-game-ui-shell-smoke` grün sind und der Diff weder Storage-/Exportlogik noch Änderungen an I09 enthält.

**I10 bleibt danach ACTIVE.** Der Checkpoint darf erst nach dem verbindlichen Kern `Storage Health + Export Backup` und dessen eigenen Exit-Gates eingefroren werden.

## Nächster Schritt

Nach P0 wird ausschließlich der verbindliche I10-Kernscope aufgelöst: Quota/Persistenzstatus, Warnschwellen, Export-/Restore-Vertrag, Fehlerpfade, Non-Goals und Exit-Gates. Erst danach beginnt I10-Produktlogik.
