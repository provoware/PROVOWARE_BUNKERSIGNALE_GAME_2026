# app/

Browser-Runtime des Projekts.

## Schichten

- `bootstrap/` – Composition Root und sicherer App-Start.
- `ui/` – Darstellung, Navigation und Accessibility.
- `application/` – Use-Cases und Orchestrierung.
- `domain/` – reine Fachlogik ohne Browser-/Speicherabhängigkeit.
- `infrastructure/` – Browser-, Laufzeit- und spätere Speicheradapter.

Die erlaubten Importgrenzen stehen in `docs/ARCHITECTURE.md` und `manifests/architecture.boundaries.json`.

## Aktueller Stand

I01 stellt die Browser-Shell sowie die read-only Health-/Recovery-Diagnose bereit. I02 ergänzt Verträge und Tooling über die Schema Registry; es führt keine Persistenz oder Spiellogik ein.

Direkte UI-Zugriffe auf Infrastructure bleiben verboten. Verdrahtung konkreter Adapter erfolgt ausschließlich über `app/bootstrap`.
