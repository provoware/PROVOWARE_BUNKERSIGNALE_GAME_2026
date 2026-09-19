# Changelog

Alle nennenswerten Änderungen dieses Projekts werden in dieser Datei dokumentiert.
Das Format orientiert sich an Keep a Changelog 1.1.0; die Produktversionierung folgt Semantic Versioning 2.0.0.

## [Unreleased]

### Added
- I10-B World Backup v1: registriertes Schema, exakter Runtime-Validator, kanonischer JSON-Serializer und read-only I08-Welt-Export.
- I10-B realer Chromium-Smoke mit 1.000 Events, zwei byteidentischen Wiederholungsexporten und 5.000-ms-Smoke-Budget.
- I10-A read-only Storage Health über Browser-Estimate/Persistenzstatus mit exakten 75-%-/90-%-Kapazitätsgrenzen und fail-soft `unknown`-Pfad.
- I10 Storage Health/Export/Restore-Kernvertrag mit deterministischem Backup-v1-Format, no-clobber Restore und expliziten Exit-Gates.
- I10 realer Chromium-Storage-Health-Smoke für Grenzwerte, API-Fehler und Diagnoseintegration.
- I10-P0 read-only Game UI Regression Shell mit Figuren-, Szenen-, Detail- und Ereignisbereich sowie vollständig deaktivierten Spielaktionen.
- I10-P0 realer Chromium-Gate für Tab-Aktivierung, Fokus, Read-only-Aktionen, Desktop-Overflow und 640-px-Einspaltenlayout.
- I09 verwerfbarer IndexedDB Snapshot Cache mit strikter Welt-/Ruleset-/Event-Fingerprint-Prüfung und vollständigem Replay-Fallback.
- I09 Chromium-Härtung für fehlende, korrupte und fingerprint-falsche Snapshots, atomaren Abort sowie 1000-Schritt-Replay-/Readback-Messwerte.
- I08 transaktionaler IndexedDB Event Store mit atomarem Batch-Append, deterministischem Welt-Readback und Legacy-v1-Kompatibilität.
- I07 Pure Reducer Foundation mit deterministischem Replay ausschließlich aus Event-Envelopes und explizitem Ruleset.
- I07 Purity-Guard, fail-closed Sequenz-/Lamport-/Ruleset-Prüfung und 1000-Event-Replay-Smoke.
- I06 Event Envelope v1 mit Schema Registry, Sequenz-/Lamport-Invarianten und definierten Trace-Feldern.
- I06 Positiv-/Negativfixtures für gültige Envelopes, ungültige Sequenz, negative Lamport-Zeit und unbekannte Zusatzfelder.
- I05 stabile world/actor/object/event IDs mit deterministischem Generator und strikter Typvalidierung.
- I05 Canonical-JSON-Serialisierung mit UTF-8, sortierten Schlüsseln, LF-Normalisierung und fail-closed Behandlung instabiler Werte.
- I05 read-only Content-Hot-Swap-Policy mit vier Sicherheitsklassen, sicherem Default und deterministischen Freigabeentscheidungen.
- I05-Regressionstests für Sofortwechsel, Neustartpflicht, Migrationspflicht und Sperre während laufender Welten.
- I04 Content Inbox mit Lock-Pin-Prüfung, Quarantäne und atomarer Aktivierung ohne Überschreiben bestehender Ziele.
- I04-Negativtests für manipulierte und ungültige Kandidaten, Pfad-Escapes und Zielkonflikte.
- I03 Content Registry + Lockfile mit exakter Paketauflösung, SHA-256-Pins und deterministischem Dependency-Resolver.
- Gemeinsamer Registry/Lock-Drift-Fingerprint sowie positive und manipulierte Content-Fixtures.
- I02 Schema Registry mit explizitem Lifecycle und exakter Versionsauflösung.
- Dependency-freie Draft-2020-12-Teilvalidierung für die im Repository verwendeten Keywords.
- Schema-Positiv- und Negativfixtures einschließlich stabiler Fehlerklassifikation.
- I01 dependency-freie Browser-App-Shell mit sicherem Bootstrap-Fallback.
- Read-only Health- und Recovery-Diagnose mit Browser-Capability-Detection.
- Tastatur-/Fokus-Basis, responsive Darstellung und `prefers-reduced-motion`-Schutz.
- I01-Strukturtests sowie realer Chromium-Boot-Smoke als Pull-Request-Gate.

### Changed
- I10 bleibt nach Export Backup v1 bewusst ACTIVE; Restore, Download und jeder neue Schreibpfad bleiben außerhalb von I10-B.
- Storage Health erhält als exakt eine visuelle I10-A-Verfeinerung einen zugänglichen Belegungsbalken in der read-only Diagnose; die Game-Shell bleibt unverändert.
- Technische Übersicht und Diagnose verwenden checkpoint-neutrale Texte statt veralteter I01-Hinweise.
- Als exakt eine visuelle I10-P0-Verfeinerung erhält nur die zentrale Szenenfläche eine Akzentkante.
- Panel-Absätze nutzen ausschließlich `text-wrap: pretty` für ruhigere Zeilenumbrüche; Layout- und Interaktionslogik bleiben unverändert.
- Aktiver Browser-Tab wird zusätzlich typografisch hervorgehoben; Navigation und Interaktionslogik bleiben unverändert.
- Verbliebene literale `\\n`-Sequenz zwischen I06-/I05-Changelog-Einträgen in echte Markdown-Zeilen getrennt.
- I06 per dokumentiertem REOPEN um kanonischen Crash/Abort-Readback, Legacy-Readback und 1000-Envelope-Profil ergänzt.
- Panel-Fließtexte auf eine ruhige maximale Zeilenbreite begrenzt; keine Navigation oder Laufzeitlogik verändert.
- I05 per dokumentiertem REOPEN an die verbindliche v0.4-Voraussetzung für Stable IDs + Canonical JSON angeglichen; bestehende Hot-Swap-Funktion bleibt unverändert.
- Text-Zeilenabstand der Browseroberfläche moderat erhöht, ohne Navigation oder Laufzeitlogik zu verändern.
- I04-Architekturvertrag an die tatsächlich geprüfte Hardlink-No-Clobber-Implementierung angepasst; Freeze-Evidence erfasst nun automatisch alle I04-Change-Records.
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
