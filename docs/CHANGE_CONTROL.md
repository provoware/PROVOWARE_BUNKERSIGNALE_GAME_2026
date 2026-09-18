# Change Control

## Change Record
Jede Änderung wird mit Change-ID, Titel, Checkpoint, Zweck, Scope, Nicht-Zielen, betroffenen Dateien/Ownern, Kompatibilitätswirkung, Sicherheitswirkung, Testplan, Rollback, Evidence und Ergebnis dokumentiert.

## Scope-Disziplin
Ein Change darf keine fachfremde Nebenreparatur mitziehen. Entdeckte zusätzliche Probleme werden separat erfasst und priorisiert. Nur unmittelbare Build-/Integritätsblocker dürfen im selben Change behoben werden, wenn sie im Report begründet sind.

## Dependency Rule
Eine neue Runtime-Abhängigkeit ist eine Architekturentscheidung. Sie darf nicht aus Bequemlichkeit eingeführt werden, wenn Browser- oder Standardbibliotheksmittel den Bedarf robust erfüllen.

## Completion
Ein Change ist erst abgeschlossen, wenn Code/Verträge, Tests, Dokumentation und Evidence denselben Zustand beschreiben.
