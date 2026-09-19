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

## 10. Erweiterungsregel
Ein neues Modul wird nur aufgenommen, wenn Owner, Eingaben, Ausgaben, Fehlerpfad, Tests, Versionierungswirkung und Rückwärtskompatibilität definiert sind.

## 11. Entscheidungshoheit
Architekturänderungen benötigen eine ADR, eine Auswirkungsanalyse und einen vollständigen Qualitätslauf. Der Orchestrator ist alleinige Merge-Instanz; Fachrollen liefern prüfbare Empfehlungen und Vetos.
