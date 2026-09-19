# S.O.U.N.D. SYSTEM-IKER

**Bunkersignale & Persönlichkeitsfraktale**

Dieses Repository ist die technische Master-Baseline ab Checkpoint I00. I02 enthält weiterhin keine Spiellogik oder Persistenz. Es ergänzt die gefreezte I01-Browser-Shell ausschließlich um eine deterministische, lokale Schema Registry.

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
- Aktueller implementierter Vertrags-Checkpoint: I02
- Produktversion: 0.1.0-alpha.0
- Spiellogik und Persistenz: noch nicht Bestandteil von I02
- Schema-Auflösung: nur explizite SemVer-Versionen, keine `latest`- oder Netzwerkauflösung
