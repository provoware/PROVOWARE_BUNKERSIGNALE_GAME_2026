# Architekturvertrag I00

## 1. Ziel
Die Architektur maximiert Wartbarkeit, Portabilität, deterministische Prüfbarkeit und spätere Erweiterbarkeit. I00 definiert den Vertrag; Spiellogik beginnt erst in späteren Checkpoints.

## 2. Schichten
1. `app/ui` - Darstellung und Benutzerinteraktion. Darf keine Persistenz oder Infrastruktur direkt verändern.
2. `app/application` - Use-Cases und Orchestrierung fachlicher Abläufe.
3. `app/domain` - reine fachliche Regeln ohne Browser- oder Speicherabhängigkeit.
4. `app/infrastructure` - Adapter für IndexedDB, Dateiimport, Browser-APIs und spätere Transportwege.
5. `app/bootstrap` - einziger Composition Root; verdrahtet konkrete Adapter mit Application/Domain.
6. `content` - versionierte Datenpakete, keine ausführbare Spiellogik.
7. `schemas` - normative Datenverträge.
8. `tools` - Entwicklungs-, Prüf- und Releasewerkzeuge; nicht Teil der Browser-Runtime.

## 3. Abhängigkeitsrichtung
- UI -> UI, Application
- Application -> Application, Domain
- Domain -> Domain
- Infrastructure -> Infrastructure, Application, Domain
- Bootstrap -> alle App-Schichten

Verboten sind insbesondere UI -> Infrastructure und Domain -> UI/Infrastructure.

## 4. Single Source of Truth
Jede fachliche Domäne besitzt genau einen State-Owner. Abgeleitete Ansichten dürfen gecacht, aber niemals als zweite fachliche Wahrheit behandelt werden. UI-State ist Präsentationszustand, kein Spielzustand.

## 5. Content und Code
Storytexte, Gerüchte, Dialoge, Graffiti-Hinweise und konfigurierbare Inhalte werden später als versionierte Content-Pakete außerhalb der Spiellogik geführt. Code referenziert stabile IDs und nicht kopierte Textinhalte.

## 6. Fehlergrenzen
Fehler werden an Schichtgrenzen in strukturierte Fehlerobjekte übersetzt. Keine tiefe Schicht darf rohe Browser-, Dateisystem- oder Bibliotheksfehler ungefiltert bis zur UI durchreichen.

## 7. Recovery
Persistente Operationen müssen später atomar oder rückrollbar sein. Ein fehlgeschlagener Import, eine Migration oder eine Sync-Operation darf den letzten grünen Zustand nicht überschreiben.

## 8. Architekturdrift
`tools/validate_repo.py` prüft lokale JavaScript-Importe gegen `manifests/architecture.boundaries.json`. Eine bewusst ungültige Negativfixture muss zuverlässig abgelehnt werden, sonst ist G1 rot.

## 9. Schema Registry I02
`manifests/schema.registry.json` ist die einzige Zuordnung von Schemaname und exakter SemVer-Version zu einer lokalen Schemadatei. `latest`, Versionsbereiche und Netzwerkauflösung sind verboten. Der Lifecycle ist ausschließlich `active -> deprecated -> retired`: Deprecated Schemas benötigen eine bewusste Freigabe, retired Schemas sind nicht mehr auflösbar. `tools/schema_registry.py` auditiert Identität und Pfad und validiert Dokumente gegen den unterstützten Draft-2020-12-Keywordumfang. Persistenz und Spiellogik gehören ausdrücklich nicht zu dieser Schicht.

## 10. Content Registry + Lockfile I03
`manifests/content.registry.json` definiert ausschließlich exakt versionierte, lokale Contentpakete und deren Abhängigkeiten. `manifests/content.lock.json` pinnt Pfad und SHA-256 jedes registrierten Pakets. `tools/content_registry.py` löst Abhängigkeiten deterministisch und read-only auf, verbietet Repository-Escape-Pfade und prüft Datei-Hashes gegen das Lockfile. Registry und Lockfile besitzen zusätzlich einen gemeinsamen Drift-Fingerprint in `manifests/content.registry-lock.sha256`. I03 aktiviert oder importiert keine Pakete; Inbox, Quarantäne und atomare Aktivierung beginnen erst in I04.

## 11. Content Inbox + Quarantäne I04
`tools/content_inbox.py` verarbeitet ausschließlich einfache Dateinamen innerhalb einer lokalen Inbox. Vor einer Aktivierung prüft `tools/content_registry.py` Paketidentität, exakte Version, Abhängigkeitsgraph und SHA-256-Lock-Pin. Aktivierung und Quarantäne erzeugen ihr Ziel per atomarem Hardlink nur dann, wenn der Zielname noch frei ist; vorhandene oder konkurrierend entstehende Ziele werden niemals ersetzt. Erst nach erfolgreicher Zielanlage wird die Quelle entfernt. Scheitert dieser Cleanup, bleibt das Ziel bewusst unangetastet, damit kein inzwischen fremd ersetztes Ziel gelöscht werden kann. Cross-Filesystem-Veröffentlichungen schlagen fail-closed fehl statt auf eine nicht-atomare Kopie auszuweichen. Pfad-Escapes und fehlende Quellen werden ebenfalls ohne Mutation abgewiesen.

Der I04-Freeze ist zusätzlich kryptografisch gebunden: Evidence- und Status-Fingerprint müssen dem aktuellen governeden Repository-Stand entsprechen; checkpoint-kritische Einzelhashes umfassen die statischen I04-Artefakte und automatisch alle I04-Change-Records.

## 12. Stable IDs + Canonical JSON I05
`manifests/domain.identity.json` definiert die stabilen ID-Klassen `world`, `actor`, `object` und `event`. `tools/domain_identity.py` erzeugt IDs deterministisch aus ID-Klasse und normalisiertem stabilen Schlüssel und validiert die Typzuordnung. Canonical JSON sortiert Objektschlüssel lexikografisch, serialisiert UTF-8 ohne Formatierungswhitespace, normalisiert CRLF/CR in Strings auf LF und weist NaN, Infinity, Nicht-String-Schlüssel sowie nicht unterstützte Typen fail-closed zurück.

## 13. Content Hot-Swap Policy I05
`manifests/content.hot-swap.json` trennt die Hot-Swap-Sicherheitsentscheidung von Registry, Lockfile und Inbox. `tools/content_hot_swap.py` arbeitet ausschließlich read-only und definiert exakt vier Klassen: `immediate_safe`, `restart_required`, `migration_required` und `blocked_while_world_running`. Textwechsel liegen verbindlich in `immediate_safe`. Unbekannte Contentarten fallen fail-closed auf `restart_required` zurück. I05 führt selbst keine Aktivierung, Migration, Persistenz oder Weltmutation aus.

## 14. Event Envelope v1 I06
`schemas/event-envelope.schema.json` definiert den ersten Event-Core-Vertrag. Pflichtfelder sind stabile Event-ID, Event-Typ, Payload, Actor-Autor, positive lokale Sequenz, nichtnegative Lamport-Zeit, exakte Ruleset-SemVer und Metadaten. Optional sind `command_id`, `correlation_id` und `causation_event_id`. Unbekannte Zusatzfelder werden abgewiesen. `tools/event_envelope.py` validiert den vollständigen Envelope vor Rückgabe und serialisiert ihn anschließend ausschließlich über den I05-Canonical-JSON-Vertrag. I06 enthält ausdrücklich noch keinen Event Store, Reducer oder Replay-Core.

## 15. Erweiterungsregel
Ein neues Modul wird nur aufgenommen, wenn Owner, Eingaben, Ausgaben, Fehlerpfad, Tests, Versionierungswirkung und Rückwärtskompatibilität definiert sind.

## 16. Entscheidungshoheit
Architekturänderungen benötigen eine ADR, eine Auswirkungsanalyse und einen vollständigen Qualitätslauf. Der Orchestrator ist alleinige Merge-Instanz; Fachrollen liefern prüfbare Empfehlungen und Vetos.
