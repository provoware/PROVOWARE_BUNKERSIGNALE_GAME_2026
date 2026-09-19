# S.O.U.N.D. SYSTEM-IKER

**Bunkersignale & Persönlichkeitsfraktale**

Dieses Repository ist die technische Master-Baseline ab Checkpoint I00. I00 enthält absichtlich noch keine Spiellogik. Es etabliert ausschließlich Regeln, Struktur, maschinenlesbare Verträge, Validierung, Regression und Evidence.

## Ein-Kommando-Prüfung

Auf Linux/Kubuntu/Mint:

```bash
./run_i00.sh
```

Plattformneutral mit Python 3.12 oder neuer:

```bash
python3 tools/run_i00_checks.py
```

Ein erfolgreicher Lauf endet mit Exit-Code 0 und erzeugt:

- `status/I00_STATUS.json`
- `evidence/I00_EVIDENCE.json`
- `evidence/I00_EVIDENCE.txt`
- `evidence/baseline.sha256`

## Grundsatz

Kein rotes Qualitätsgate wird durch Weiterentwicklung umgangen. Eine technische Lücke wird nicht durch einen vagen Marker kaschiert, sondern als Scope-Ausschluss mit Zieliteration und Fallback dokumentiert.

## Projektstatus

- Spezifikationsbasis: MASTER-Entwicklungsplan v0.4
- Gefreezte Governance-/Architekturbasis: I00
- Aktueller implementierter Runtime-Checkpoint: I02
- Produktversion: 0.1.0-alpha.0
- Spiellogik: noch nicht Bestandteil von I02
- Nächster Checkpoint: I03
