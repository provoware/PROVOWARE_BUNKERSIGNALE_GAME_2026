# Globale Standards und Vereinheitlichungen

## Verbindliche Baseline
- Produktversionierung: Semantic Versioning 2.0.0.
- Commit-Syntax: Conventional Commits 1.0.0.
- Changelog-Struktur: Keep a Changelog 1.1.0.
- JSON-Schemas: JSON Schema Draft 2020-12.
- Web-Accessibility-Ziel: WCAG 2.2 Level AA als Entwicklungsziel; eine formale Konformitätsbehauptung erfolgt erst nach separater Prüfung.
- Security-Referenz: OWASP ASVS 5.0.0 als risikobasierte Prüfreferenz; I00 behauptet keine vollständige ASVS-Konformität.
- Textkodierung: UTF-8.
- Repository-Zeilenenden: LF.
- Zeitstempel in persistenten technischen Daten: UTC, RFC-3339-kompatible ISO-8601-Darstellung.
- Hash-Standard für Evidence und Integritätsprüfungen: SHA-256.
- JSON-Schlüssel: `snake_case`.
- JavaScript-Bezeichner ab I01: `camelCase`, Klassen `PascalCase`, Konstanten `UPPER_SNAKE_CASE`.
- CSS ab I01: Custom Properties mit Präfix `--ssi-`; Komponentenklassen mit Präfix `ssi-`.
- Fehlercodes: `SSI-{DOMAIN}-{NNNN}`.
- Change-IDs: `CHG-YYYYMMDD-NNN`.
- ADR-IDs: `ADR-NNNN`.

## Portabilität
Runtime-Code SOLL browsernativ und feature-detektiert sein. Betriebssystem- oder Browsererkennung darf nicht als Ersatz für Capability Detection dienen. Entwicklungswerkzeuge erhalten einen plattformneutralen Python-Einstieg; Shellskripte sind nur Komfortadapter.

## Daten und Zeit
Persistente Fachlogik darf nicht von lokaler Zeitzone oder Darstellungssprache abhängen. Zeitpunkte werden technisch in UTC gespeichert; die Anzeige darf lokalisiert werden.

## Accessibility und Bewegung
Bewegung, Audio-Reaktivität und spätere Lichtsimulationen müssen `prefers-reduced-motion` respektieren. Gefährliche Blinkmuster werden nicht als notwendiger Gameplaykanal verwendet.

## Security-Grundhaltung
Eingaben werden an Vertrauensgrenzen validiert. Lokale Daten gelten nicht automatisch als vertrauenswürdig. Fehlermeldungen zeigen keine Secrets. Dateipfade, Imports und externe Inhalte werden auf erlaubte Bereiche begrenzt.

## Dokumentation
Normative Regeln besitzen einen maschinenlesbaren Gegenpart, sobald eine automatische Prüfung sinnvoll möglich ist. Dokumentation darf Regeln erklären, aber nicht einer abweichenden Maschinenregel widersprechen.
