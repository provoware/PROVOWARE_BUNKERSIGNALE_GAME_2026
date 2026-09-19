# S.O.U.N.D. SYSTEM-IKER

**Bunkersignale & Persönlichkeitsfraktale**

Local-first Browser-Prototyp mit strengem Checkpoint-, Evidence- und Regression-Modell. Das Repository wird bewusst dependency-arm entwickelt und trennt Runtime, Verträge, Tests und Entwicklungsnachweise klar voneinander.

## Aktueller Stand

| Bereich | Stand |
| --- | --- |
| Produktversion | `0.1.0-alpha.0` |
| Aktueller Checkpoint | **I04 – Content Inbox + Quarantäne** |
| Nächster Checkpoint | **I05** |
| Runtime | Browser, local-first |
| Buildschritt | nicht erforderlich |
| Paketmanager | nicht erforderlich |
| Persistente Weltdaten | noch nicht aktiv |
| Spiellogik | noch nicht aktiv |

Bereits umgesetzt:

- **I00** – Governance, Architekturregeln, Fehlercodes, Regression und Evidence-Baseline.
- **I01** – dependency-freie Browser-Shell mit Safe-Start sowie read-only Health/Recovery-Diagnose.
- **I02** – lokale Schema Registry mit exakter Versionsauflösung, Lifecycle-Regeln sowie Positiv-/Negativtests.
- **I03** – read-only Content Registry + Lockfile mit exakter Paketauflösung, SHA-256-Pins, deterministischem Dependency-Resolver und gemeinsamer Drift-Erkennung.
- **I04** – lokale Inbox mit Lock-Pin-Prüfung, Quarantäne ungültiger Kandidaten und atomarer Aktivierung in noch freie Paketziele.

## Schnellstart

Für einen lokalen Browserstart im Repository:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Danach im Browser `http://127.0.0.1:8765/` öffnen.

## Qualitätsprüfung

Auf Linux/Kubuntu/Mint:

```bash
./run_i00.sh
```

Plattformneutral:

```bash
python3 tools/run_i00_checks.py
```

Der Dateiname `run_i00` bleibt aus Kompatibilitätsgründen erhalten. Der Lauf prüft inzwischen den **gesamten aktuellen Repository-Stand** einschließlich späterer Regressionstests. Ab Checkpoint I01 wird die eingefrorene I00-Evidence dabei **nicht mehr überschrieben**.

## Repository-Struktur

| Pfad | Zweck |
| --- | --- |
| `app/` | Browser-Runtime: Bootstrap, UI, Application und Infrastructure |
| `schemas/` | versionierte JSON-Schema-Verträge |
| `manifests/` | maschinenlesbare Governance, Toolchain und Registry |
| `content/` | spätere versionierte Story-/Contentdaten |
| `data/` | keine Runtime-Daten; nur klar definierte Entwicklungsdaten |
| `tests/` | Unit-, Negativ-, Architektur- und Checkpointtests |
| `tools/` | lokale Validierung und Qualitätswerkzeuge |
| `changes/` | nachvollziehbare Change Records |
| `evidence/` | eingefrorene Checkpoint-Nachweise |
| `status/` | maschinenlesbarer Checkpointstatus |
| `docs/` | Architektur, Standards, Betrieb und Referenzen |

Dokumentationsindex: **[docs/README.md](docs/README.md)**

## Entwicklungsregeln

- Kein rotes Gate wird durch Weiterentwicklung umgangen.
- Änderungen bleiben auf den kleinsten fachlich sinnvollen Scope begrenzt.
- Gefreezte Evidence wird nicht still neu geschrieben.
- Runtime-Code importiert nur entlang der definierten Schichtgrenzen.
- Schema- und Content-Auflösung sind lokal und versionsgenau; kein `latest`, keine Netzwerkauflösung.
- I04 verarbeitet nur explizit benannte lokale Inbox-Kandidaten; Zielkonflikte schlagen ohne Überschreiben fehl.
- Neue Runtime-Abhängigkeiten benötigen eine begründete Architekturentscheidung.
- Persistente Weltdaten, produktive Contentpakete und Spiellogik werden nicht vorgezogen.

## Lizenzstatus

Das Projekt ist derzeit **UNLICENSED**. Ohne separate Lizenzdatei werden keine weitergehenden Nutzungsrechte eingeräumt.
