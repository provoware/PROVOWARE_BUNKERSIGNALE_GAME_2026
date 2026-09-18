# ADR-0001: Local-first, geschichtete Browser-Architektur mit maschinenlesbarer Governance

- Status: Accepted
- Datum: 2026-09-18
- Checkpoint: I00

## Kontext
Das Spiel soll langfristig erweiterbar, lokal lauffähig, plattformübergreifend, contentgetrieben und später synchronisierbar sein. Direkte Kopplung von UI, Spielregeln, Persistenz und Content würde Wartung, Replay, Migration und Regression unnötig riskant machen.

## Entscheidung
Wir verwenden eine geschichtete Browser-Architektur mit Domain/Application/UI/Infrastructure und einem expliziten Bootstrap-Composition-Root. Content und Schemas bleiben getrennt. Governance, Architekturgrenzen und Rollen werden zusätzlich maschinenlesbar dokumentiert und durch einen lokalen Python-Validator geprüft.

## Konsequenzen
Positiv sind klare State-Owner, leichter testbare reine Fachlogik, austauschbare Browseradapter, getrennte Content-Updates und erkennbare Architekturdrift. Die Kosten sind mehr Disziplin und Vertragsdateien sowie bewusst erschwerte Abkürzungen.

## Revisit
Eine Änderung dieser Grundarchitektur benötigt eine neue ADR und einen REOPEN des Checkpoints I00.
