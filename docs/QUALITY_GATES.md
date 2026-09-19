# Qualitätsgates

## G0 - Governance
Version, Change-Regeln, Subagentenrollen, Freeze/REOPEN und Dokumenthoheit sind konsistent.

## G1 - Struktur und Architektur
Pflichtdateien, Maschinenverträge und Importgrenzen sind gültig. Die Negativfixture wird zuverlässig abgewiesen.

## G2 - Fachlogik
Ab I05/I06 relevant. I00 darf keine Spiellogik einführen.

## G3 - Determinismus und Invarianten
Ab Event-Core relevant; I00 definiert die Pflicht bereits normativ.

## G4 - Persistenz und Recovery
Ab Persistenzphase relevant; I00 definiert Recovery- und Rollbackprinzip.

## G5 - Merge und Konflikte
Ab synchronisierbaren Domänen relevant.

## G6 - Integrität und Datenverlustschutz
In I00 bereits teilweise durch Fingerprints, Evidence und Fail-Safe aktiv.

## G7 - UX und Accessibility
Ab I01 sichtbar prüfbar. In I00 als WCAG-2.2-AA-Ziel und Fehlerkommunikationsregel definiert.

## G8 - Dokumentation und Wartbarkeit
In I00 voll aktiv: klare Standards, Ein-Kommando-Prüfung, keine offenen Code-Platzhalter, maschinenlesbare Verträge.

## I00 Exit
I00 ist nur grün, wenn G0, G1 und G8 vollständig grün sowie die I00-Anteile von G6 ohne Fehler sind.

## I03 Exit
I03 ist nur grün, wenn G1, G2 und G8 vollständig grün sind, die I02-Schema-Regression bestehen bleibt, Registry und Lockfile gemeinsam gegen Drift geprüft werden und keine I04-Funktion (Inbox, Quarantäne, Aktivierung) eingeführt wurde.

## I04 Exit
I04 ist nur grün, wenn alle bisherigen Regressionen bestehen bleiben, Kandidaten vor Aktivierung gegen Identität, Version, Abhängigkeiten und Lock-Pin geprüft werden, ungültige Kandidaten quarantänisiert werden und weder Aktivierung noch Quarantäne ein vorhandenes Ziel überschreibt.

## I05 Exit
I05 ist nur grün, wenn stabile world/actor/object/event IDs deterministisch erzeugt und typgeprüft werden, Canonical JSON für Schlüsselreihenfolge, UTF-8, Unicode, Zahlen und LF-Normalisierung byteidentisch bleibt und instabile Werte fail-closed abweist. Zusätzlich müssen die bereits eingefrorenen Hot-Swap-Klassen unverändert grün bleiben. G1/G2/G3 sowie die relevanten G6/G8-Anteile müssen grün sein.

## I06 Exit
I06 ist nur grün, wenn Event Envelope v1 alle Pflichtfelder und die optionalen Trace-Felder eindeutig definiert, stabile ID-Typen erzwingt, sequence >= 1 und lamport >= 0 garantiert, unbekannte Zusatzfelder fail-closed abweist und identische Envelopes über Canonical JSON byteidentisch serialisiert werden. G1/G2/G3 müssen grün sein; trunkierte/nicht-kanonische Readbacks müssen abgewiesen werden und Legacy-/Großwelt-Readback muss innerhalb des dokumentierten Smokebudgets bleiben. Persistenter Event Store, Reducer und Replay bleiben außerhalb dieses Checkpoints.
