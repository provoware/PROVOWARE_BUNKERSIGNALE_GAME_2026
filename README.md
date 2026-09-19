# S.O.U.N.D. SYSTEM-IKER

**Bunkersignale & Persönlichkeitsfraktale**

Local-first Browser-Prototyp mit strengem Checkpoint-, Evidence- und Regression-Modell. Das Repository wird bewusst dependency-arm entwickelt und trennt Runtime, Verträge, Tests und Entwicklungsnachweise klar voneinander.

## Aktueller Stand

| Bereich | Stand |
| --- | --- |
| Produktversion | `0.1.0-alpha.0` |
| Aktueller Checkpoint | **I10 – Storage Health + Export Backup (P0: Game UI Regression Shell)** |
| Nächster Checkpoint | **I11 – Hash Chain** |
| Runtime | Browser, local-first |
| Buildschritt | nicht erforderlich |
| Paketmanager | nicht erforderlich |
| Persistente Eventdaten | **I08 aktiv – IndexedDB Event Store** |
| Snapshot Cache | **I09 – verwerfbarer Cache; Eventlog bleibt Wahrheit** |
| Spieloberfläche | **I10-P0 – read-only Regression Shell aktiv** |
| Storage Health / Export | **I10-Kern noch nicht implementiert** |
| Spiellogik | noch nicht aktiv |

Bereits umgesetzt:

- **I00** – Governance, Architekturregeln, Fehlercodes, Regression und Evidence-Baseline.
- **I01** – dependency-freie Browser-Shell mit Safe-Start sowie read-only Health/Recovery-Diagnose.
- **I02** – lokale Schema Registry mit exakter Versionsauflösung, Lifecycle-Regeln sowie Positiv-/Negativtests.
- **I03** – read-only Content Registry + Lockfile mit exakter Paketauflösung, SHA-256-Pins, deterministischem Dependency-Resolver und gemeinsamer Drift-Erkennung.
- **I04** – lokale Inbox mit Lock-Pin-Prüfung, Quarantäne ungültiger Kandidaten und atomarer Aktivierung in noch freie Paketziele.
- **I05** – stabile world/actor/object/event IDs, Canonical JSON sowie read-only Hot-Swap-Policy.
- **I06** – Event Envelope v1 mit Schema, Sequenz-/Lamport-Invarianten, Trace-Feldern und Negative Fixtures.
- **I07** – deterministische Pure-Reducer-Grundlage mit fail-closed Replay-Invarianten und Purity-Guard.
- **I08** – transaktionaler IndexedDB Event Store mit Weltzuordnung als Storage-Metadatum, deterministischem Readback und vollständigem Rollback bei Abort, Duplicate sowie synchronen Queue-/Clone-Fehlern.
- **I09** – verwerfbarer IndexedDB Snapshot Cache mit Fingerprint-Prüfung, vollständigem Replay-Fallback und Crash-/Abort-Schutz; das Eventlog bleibt alleinige Wahrheit.
- **I10-P0** – read-only Game UI Regression Shell mit Figuren-, Szenen-, Detail- und Ereignisbereich; alle Spielaktionen bleiben deaktiviert.

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
- I05 stellt stabile Identitäten und Canonical JSON bereit; Contentwechsel bleiben read-only klassifiziert.
- I06 validiert vollständige Event Envelopes, persistiert aber noch keine Events.
- I07 reduziert ausschließlich aus Events + Ruleset und besitzt keine Zeit-, Zufalls-, Storage-/Datei- oder Netzwerkabhängigkeit.
- I08 persistiert Events transaktional in IndexedDB; die Weltzuordnung liegt außerhalb des unveränderten I06-Envelope-Vertrags als Storage-Metadatum.
- I09 nutzt Snapshots ausschließlich als beschleunigenden Cache; fehlende, korrupte oder fingerprint-falsche Snapshots werden verworfen und vollständig replayt.
- I10-P0 stellt ausschließlich eine read-only Spielansicht für DOM-/Layout-/Fokusregression bereit; sie erzeugt keine Commands, Events oder Persistenzmutationen.
- Neue Runtime-Abhängigkeiten benötigen eine begründete Architekturentscheidung.
- Der I10-Kern für Storage Health + Export Backup folgt erst nach dem P0-Regressionsgate; Hashketten, Crypto, produktive Contentpakete und echte Spiellogik werden weiterhin nicht vorgezogen.

## Lizenzstatus

Das Projekt ist derzeit **UNLICENSED**. Ohne separate Lizenzdatei werden keine weitergehenden Nutzungsrechte eingeräumt.
