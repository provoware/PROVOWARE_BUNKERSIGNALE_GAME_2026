# I05 – Entwicklungsprotokoll

## Status

**IN ARBEIT – nicht gefreezt**

I04 bleibt unverändert eingefroren. Diese Datei dokumentiert ausschließlich Arbeiten nach dem I04-Freeze auf dem I05-Entwicklungszweig.

## Änderung 2026-09-19 – Lesekomfort der Browser-Shell

### Zweck

Als bewusst kleiner, risikoarmer I05-Einstieg wird genau ein visueller UX-Aspekt verbessert: der grundlegende Lesekomfort längerer Fließ- und Statustexte.

### Betroffener Bereich

- `app/ui/styles.css`
- globale Textdarstellung im `body`

### Patch

Die Basis-Zeilenhöhe wird auf `1.5` gesetzt. Die bereits separat definierte kompakte Überschriften-Zeilenhöhe (`h1`, `h2`) bleibt unverändert.

### Begründung

Die Änderung erhöht die vertikale Trennung mehrzeiliger Texte, ohne Farben, Layoutbreiten, Komponentenstruktur, Statuslogik oder Runtime-Verhalten anzufassen. Damit bleibt der Eingriff visuell klar abgegrenzt und technisch minimal.

### Bewusste Nicht-Änderungen

- kein REOPEN von I04;
- keine Änderung an Content Inbox, Quarantäne, Registry oder Lockfile;
- keine Persistenz- oder Spiellogik;
- keine neue Abhängigkeit;
- keine Farb-, Typografie- oder Komponenten-Neugestaltung;
- kein Vorgriff auf noch nicht verifizierten funktionalen I05-Scope.

### Validierung

Erforderlich vor Merge:

1. Repository-Quality-Gate auf dem Branch muss GREEN sein.
2. Browser-/Chromium-Smoke muss GREEN sein.
3. Diff muss ausschließlich den dokumentierten UX-Scope und dieses Entwicklungsprotokoll enthalten.
4. Bei rotem Gate kein Merge und kein Freeze.

### Restrisiko

Niedrig. Die globale Zeilenhöhe kann die vertikale Höhe einzelner Textblöcke leicht vergrößern. Das ist beabsichtigt; funktionale Interaktionen werden nicht verändert.

### Nächster Schritt

Nach grünen Gates den exakten funktionalen I05-Scope gegen die verbindlichen Repository-Verträge und die Masterplanung verifizieren. Erst danach den kleinsten funktionalen I05-Patch beginnen. I05 wird erst nach vollständiger Evidence- und Gate-Prüfung gefreezt.
