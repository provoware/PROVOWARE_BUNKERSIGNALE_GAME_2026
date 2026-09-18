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
