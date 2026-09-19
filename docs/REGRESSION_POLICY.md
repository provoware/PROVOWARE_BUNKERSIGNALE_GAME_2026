# Regression und Qualitätsgates

## Grundsatz

Eine Änderung gilt erst als akzeptiert, wenn neue Funktion und bereits gefreezte Verträge gemeinsam grün sind.

## Basis-Regressionsumfang

Der historische Einstieg `run_i00.sh` beziehungsweise `tools/run_i00_checks.py` bleibt aus Kompatibilitätsgründen erhalten, prüft aber den **aktuellen gesamten Repository-Stand**.

Jeder Lauf prüft mindestens:

1. Python-Mindestversion.
2. Pflichtdateien.
3. JSON-Syntax aller maschinenlesbaren Verträge.
4. Produktversion und numerisch korrekte Checkpointfolge.
5. Change-Historie und eindeutige Change-IDs.
6. Agenten-/Merge-Hoheit.
7. Architektur-Positivfixture.
8. Architektur-Negativfixture muss abgelehnt werden.
9. keine verbotenen Entwicklungsmarker in ausführbarem Code und Maschinenkonfiguration.
10. Python-Bytecode-Kompilierung.
11. alle vorhandenen Unit-/Checkpointtests.
12. SHA-256-Fingerprint aller governeden Dateien.

## Eingefrorene I00-Baseline

`evidence/baseline.sha256` enthält den ursprünglichen I00-Gesamtfingerprint und die Einzelhashes der damaligen governeden Dateien.

Ab einem späteren Projektcheckpoint schreibt der Standard-Qualitätslauf **nicht** erneut nach:

- `evidence/I00_EVIDENCE.json`
- `evidence/I00_EVIDENCE.txt`
- `evidence/baseline.sha256`
- `status/I00_STATUS.json`

Damit bleibt die I00-Evidence ein historischer Freeze statt eines beweglichen Statusreports.

## Regression bei späteren Checkpoints

Jeder spätere Checkpoint MUSS die bisherigen Garantien weiterhin erfüllen. Checkpoint-spezifische Tests werden über die vorhandene Testsuite ergänzt. Ein Fehler in einer früheren Garantie setzt den neuen Checkpoint auf rot.

## I02-Regressionsumfang

I02 prüft zusätzlich Registry-Selbstvalidierung, lokale Schema-Identitäten, exakte Versionsauflösung, Lifecycle-Sperren sowie eine gültige Positivfixture. Jede Negativfixture muss mit dem dort deklarierten stabilen Fehlercode abgewiesen werden.

## Rollback

Ein fehlgeschlagener Checkpoint wird nicht vorwärts repariert, solange die letzte grüne Basis nicht reproduzierbar ist. Rollback bedeutet Wiederherstellung des letzten grünen Checkpoints plus erneuten vollständigen Qualitätslauf.
