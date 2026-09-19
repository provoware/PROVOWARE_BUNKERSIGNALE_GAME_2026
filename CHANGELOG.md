# Changelog

Alle nennenswerten Änderungen dieses Projekts werden in dieser Datei dokumentiert.
Das Format orientiert sich an Keep a Changelog 1.1.0; die Produktversionierung folgt Semantic Versioning 2.0.0.

## [Unreleased]

### Added
- I02 Schema Registry mit explizitem Lifecycle und exakter Versionsauflösung.
- Dependency-freie Draft-2020-12-Teilvalidierung für die im Repository verwendeten Keywords.
- Schema-Positiv- und Negativfixtures einschließlich stabiler Fehlerklassifikation.
- I01 dependency-freie Browser-App-Shell mit sicherem Bootstrap-Fallback.
- Read-only Health- und Recovery-Diagnose mit Browser-Capability-Detection.
- Tastatur-/Fokus-Basis, responsive Darstellung und `prefers-reduced-motion`-Schutz.
- I01-Strukturtests sowie realer Chromium-Boot-Smoke als Pull-Request-Gate.

### Changed
- Repository-Einstieg und Bereichs-READMEs auf den tatsächlichen I02-Stand ausgerichtet.
- Projektmanifest auf `I02 -> I03` aktualisiert und Checkpoint-Schema zukunftsfähig gemacht.
- Dokumentationsindex und klarer Referenzbereich für historische Arbeitsanweisungen ergänzt.
- Eingefrorene I00-Evidence wird durch spätere Qualitätsläufe nicht mehr still überschrieben.
- Change-Record-Prüfung von fest verdrahteten Dateinamen auf dynamische Historienprüfung umgestellt.

### Repository
- Historische Masteranweisung aus dem Repository-Root nach `docs/reference/` verschoben.

## [0.1.0-alpha.0] - 2026-09-18

### Added
- I00 Repo-Vertrag und Entwicklungsmanifest.
- Normative Architektur-, Entwicklungs-, Fehler-, Regression- und Subagentenregeln.
- Maschinenlesbare Manifeste für Projekt, Architekturgrenzen, Qualitätsgates, Produkt-DNA, Toolchain und Agentenrollen.
- Selbstenthaltender Python-3.12+-Validator ohne externe Laufzeitabhängigkeiten.
- Positive und negative Architektur-Fixtures.
- Ein-Kommando-Qualitätsprüfung mit Evidence- und Statusreport-Erzeugung.

### Security
- Fehlerausgaben trennen nutzerverständliche Meldungen von technischen Diagnosedaten.
- Kein Secret-, Token- oder personenbezogener Inhalt ist Bestandteil von I00.
