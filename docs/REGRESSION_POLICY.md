# Regression und Qualitätsgates

## Grundsatz
Eine Änderung gilt erst als akzeptiert, wenn neue Funktion und bereits gefreezte Verträge gemeinsam grün sind.

## I00-Regressionsumfang
Jeder I00-Lauf prüft:
1. Python-Mindestversion.
2. Pflichtdateien.
3. JSON-Syntax aller maschinenlesbaren Verträge.
4. Versionskonsistenz.
5. Agenten-/Merge-Hoheit.
6. Architektur-Positivfixture.
7. Architektur-Negativfixture muss abgelehnt werden.
8. keine verbotenen Entwicklungsmarker in ausführbarem Code und Maschinenkonfiguration.
9. Python-Bytecode-Kompilierung.
10. Unit-Tests.
11. SHA-256-Fingerprint aller governeden Dateien.
12. Evidence- und Statusreport.

## Baseline
`evidence/baseline.sha256` enthält den Gesamtfingerprint und die Einzelhashes governeder Dateien. Evidence- und Statusdateien selbst sind ausgeschlossen, um Rekursion zu vermeiden.

## Regression bei späteren Checkpoints
Jeder spätere Checkpoint MUSS den kompletten I00-Lauf weiterhin bestehen. Zusätzlich kommen checkpoint-spezifische Tests hinzu. Ein Fehler in einer früheren Garantie setzt den neuen Checkpoint auf rot.

## Rollback
Ein fehlgeschlagener Checkpoint wird nicht vorwärts repariert, solange die letzte grüne Basis nicht reproduzierbar ist. Rollback bedeutet Wiederherstellung des letzten grünen Fingerprints plus erneuten Komplettlauf.
