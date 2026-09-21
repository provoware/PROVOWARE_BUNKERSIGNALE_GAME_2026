# Entwicklungsregeln

## Normative Sprache
- MUSS / DARF NICHT: harte Regel.
- SOLL / SOLLTE: Standardweg; Abweichung braucht dokumentierte Begründung.
- KANN: optionale Erweiterung.

## Null-Lücken-Regel
Jede technische Funktion MUSS Owner, Eingaben, Ausgaben, Fehlerpfad, Test und Abnahmekriterium besitzen. Verschobene Funktionen gelten nur dann als sauber ausgeschlossen, wenn Zieliteration, Abhängigkeit und aktuelles Fallback dokumentiert sind.

## Kein Platzhaltercode
Ausführbarer Code und maschinenlesbare Konfiguration DARF KEINE offenen Entwicklungsmarker, Dummy-Rückgaben oder syntaktischen Auslassungswerte enthalten. Nicht implementierte Zukunftsfunktionen werden nicht als tote Stubs angelegt.

## Kleine Änderungen
Änderungen SOLLEN die kleinste sinnvolle Einheit bilden. Ein Checkpoint wird geteilt, wenn das vereinbarte Änderungsvolumen überschritten wird.

## Determinismus
Fachliche Berechnungen, Migrationen, Merges und Zufallsentscheidungen müssen später reproduzierbar sein. Zeit, Seed, Regelversion und Eingaben werden dort explizit, wo sie fachlich relevant sind.

## Abhängigkeiten
Neue externe Abhängigkeiten benötigen dokumentierten Bedarf, Lizenz- und Wartungsprüfung, Lock/Pin-Strategie, Entfernungspfad, Security-Auswirkung und bei Runtime-Abhängigkeiten eine ADR. I00 verwendet für seine Prüfwerkzeuge ausschließlich die Python-Standardbibliothek.

## Änderungskontrolle
Jede Änderung erhält eine Change-ID im Format `CHG-YYYYMMDD-NNN`. Vor Merge müssen Scope, betroffene Owner, Risiken, Regressionstests, Rollback und Evidence dokumentiert sein.

## Freeze und REOPEN
Ein gefreezter Checkpoint wird nicht still verändert. Änderungen an einem gefreezten Bereich erzeugen einen REOPEN-Eintrag, erneuern dessen Evidence und prüfen abhängige Checkpoints erneut.

## Commit-Standard
Commit-Nachrichten folgen Conventional Commits 1.0.0. Zulässige Primärtypen sind `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore` und `revert`.

## Versionsstandard
Produktversionen folgen Semantic Versioning 2.0.0. Spezifikations-, Schema-, Content- und Produktversion sind getrennte Dimensionen und dürfen nicht implizit gekoppelt werden.


## Ein visueller Delta pro Iteration

Grafische oder spielweltliche Weiterentwicklung erfolgt standardmäßig in genau einem klar begrenzten Delta pro Iteration. Der `visual_world_director` definiert zuerst Zweck, Zieldatei/Aspekt, Akzeptanzkriterien und Non-Goals. Folgeideen werden ausschließlich im Visual-World-Masterplan vorgemerkt.

## CI-/Traffic-Effizienz

- Vor dem ersten Write werden vorhandene Verträge, Trigger und Pfad-Gates gelesen.
- Dokumentations-/Governance-Anpassungen desselben Scopes werden möglichst in einem Commit gebündelt.
- Evidence wird erst nach grünen funktionalen Gates gebunden.
- Bereits grüne, nicht durch Pfade betroffene Regressionen werden nicht künstlich neu ausgelöst.
- Ein roter Gate wird anhand seines konkreten Logs behoben; keine zusätzlichen Scope-Patches auf Verdacht.


## Green-first Remote-Disziplin

Remote-CI ist ein Abnahmegate und kein Ersatz fuer lokale Vorpruefung.

Vor dem ersten Remote-Push einer normalen Iteration MUSS der Branch lokal soweit moeglich bereits den finalen semantischen Stand enthalten:

1. verbindlichen Scope und Non-Goals lesen;
2. betroffene Trigger/Owner vor dem ersten Write bestimmen;
3. Produkt-/Contract-/Dokumentationspatch plus Change Record in einem zusammenhaengenden Write-Batch erstellen;
4. lokale Quality/Contract-Tests ausfuehren und den governed Fingerprint bestimmen;
5. notwendige Evidence/Status-Bindung noch lokal auf denselben Fingerprint setzen;
6. lokale Quality erneut gruen bestaetigen;
7. erst dann pushen und PR-CI als unabhaengige Gegenpruefung verwenden.

Ein absichtlich roter Remote-Push nur zum Ermitteln des Fingerprints ist ab jetzt NICHT der Standardweg. Ausnahme: ein benoetigtes Gate ist lokal technisch nicht reproduzierbar. Diese Ausnahme MUSS im Change Record begruendet werden.

## Write-Batch- und CI-Sparsamkeit

- Erst lesen/analysieren, dann schreiben: Dateien, Imports, Trigger und Freeze-Grenzen werden vor dem ersten Patch gemeinsam geprueft.
- Pro Iteration SOLL es genau einen fachlichen Write-Batch geben. Weitere Patches sind nur fuer konkret nachgewiesene Fehler zulaessig.
- Evidence-/Status-Dateien sind kein eigener Entwicklungsblock; sie werden als Abschluss desselben semantischen Branch-Stands gebunden.
- CI-Workflows SOLLEN nur auf Pfade reagieren, die ihren getesteten Runtime-/Contract-Pfad tatsaechlich beeinflussen.
- Governance-Metadaten wie `changes/**`, `evidence/**` und `status/**` DUERFEN keinen fachfremden Browser-Smoke ausloesen.
- Ueberholte CI-Laeufe derselben PR SOLLEN per `concurrency.cancel-in-progress` beendet werden.
- `quality` laeuft auf Pull Requests und auf Pushes nach `main`; Feature-Branch-Push + PR duerfen nicht denselben Quality-Stand doppelt pruefen.

## Codesparsamkeit und Testklarheit

- Produktcode wird nach Verantwortungen geteilt, nicht nach Dateilaenge. Kleine Orchestratoren SOLLEN unter etwa 100 Zeilen bleiben, solange dadurch keine versteckte Mehrfachverantwortung entsteht.
- Sicherheitskritische Tests duerfen bewusst expliziter sein als Produktcode. Test-Helfer werden erst eingefuehrt, wenn dieselbe Setup-/Assertion-Logik in mindestens drei unabhaengigen Tests wiederkehrt und die Sicherheitsinvarianten dadurch nicht verdeckt werden.
- Keine Abstraktion nur zur Zeilenreduktion. Weniger Zeilen sind nur dann ein Gewinn, wenn Ownership, Fehlerpfade und Tests mindestens gleich klar bleiben.
- Ein neuer Helper MUSS mindestens zwei reale Aufrufer besitzen oder einen klar dokumentierten unmittelbar folgenden zweiten Aufrufer haben.
- Dokumentation folgt Single-Source-of-Truth: detaillierte Vertraege leben in genau einer Contract-/Decision-Datei; Masterplaene enthalten nur Status, Abhaengigkeit, Freeze-Grenze und Verweis statt den Vollvertrag zu duplizieren.
