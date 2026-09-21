# Visual-World Masterplan – Bunkersignale

## Leitidee

Die Hauptoberfläche soll perspektivisch den Blick auf einen **riesigen verlassenen Bunker** öffnen. Der Bunker ist kein Hintergrundbild ohne Funktion, sondern der räumliche Mittelpunkt einer später ausbaubaren Welt: Zugang, Vorfeld, technische Restflächen und freie Zonen erklären Geschichte und schaffen Platz für spätere Spielmechaniken.

## Story-Prämisse

Der Ort war einmal groß, funktional und kontrolliert. Jetzt ist er verlassen, beschädigt und nur teilweise lesbar. Spuren früherer Nutzung sollen Fragen erzeugen, ohne Antworten vorwegzunehmen. Neue Aufbauten der Spieler müssen später sichtbar mit dem alten Bestand konkurrieren oder ihn ergänzen können.

## Räumliches Grundmodell

- **Vordergrund:** sicher lesbarer Beobachtungs-/Ankunftsbereich; spätere Interaktions- und Baufläche.
- **Mittelgrund:** Bunkervorfeld, Zufahrt, versiegelte Flächen, Trümmer-/Materialzonen und klare Wegeachsen.
- **Hauptmotiv:** monumentale Bunkerfront mit großem Eingang als stärkste Landmarke.
- **Hintergrund:** Gelände-/Industriesilhouette, Nebel/Himmel und wenige Fernmarker; kein visuelles Rauschen.

## Erweiterungsflächen

Von Beginn an freihalten:
- Versorgungs-/Generatorzone,
- Werkstatt-/Lagerfläche,
- Funk-/Beobachtungsposition,
- Zugangskorridor zum Bunker,
- seitliche Reservefläche für spätere Gebäude,
- nachvollziehbare Wege zwischen allen Zonen.

## Visuelle Regeln

- Beton, Stahl, Oxidation, Feuchtigkeit, Abrieb und überwucherte Randbereiche.
- wenige starke Landmarken statt vieler gleichwertiger Details.
- Licht führt zum Bunkereingang und zu späteren Interaktionspunkten.
- Texturen dürfen UI-Lesbarkeit nicht beeinträchtigen.
- keine Information ausschließlich über Farbe vermitteln.
- reduzierte Bewegung; `prefers-reduced-motion` respektieren.

## Performance-/Asset-Budget

Bis ein eigener Asset-Pipeline-Checkpoint existiert:
- keine externen Runtime-Abhängigkeiten,
- keine ungeprüften großen Rasterassets,
- neue visuelle Dateien einzeln und nachvollziehbar,
- progressive Ergänzung statt Komplettaustausch.

## Iterationsfolge

| Visual-Iteration | genau ein Aspekt | Zieldatei/Artefakt | Status |
| --- | --- | --- | --- |
| VW-001 | Hauptkomposition: Bunkerblick + Ausbauumfeld | `docs/visual-world/VW-001_BUNKER_OVERLOOK.md` | ABGESCHLOSSEN |
| VW-002 | Bunkerfront: Form, Maßstab, Eingangshierarchie | `docs/visual-world/VW-002_BUNKER_FRONT.md` | ABGESCHLOSSEN |
| VW-003 | Vorfeld-/Wegeachsen für spätere Aufbauten | `docs/visual-world/VW-003_FORECOURT_ROUTES.md` | ABGESCHLOSSEN |
| VW-004 | Material-/Alterungslogik | `docs/visual-world/VW-004_MATERIAL_AGING.md` | ABGESCHLOSSEN |
| VW-005 | Licht-/Atmosphärenhierarchie | `docs/visual-world/VW-005_LIGHT_ATMOSPHERE.md` | ABGESCHLOSSEN |
| VW-006 | Landmarken und Fernsilhouette | `docs/visual-world/VW-006_LANDMARKS_HORIZON.md` | ABGESCHLOSSEN |
| VW-007 | UI↔Spielwelt-Lesbarkeit | `docs/visual-world/VW-007_UI_WORLD_READABILITY.md` | AKTIV |

Jede Folgeiteration wird erst nach grünem Vorgänger konkretisiert. Sie darf genau einen Aspekt implementieren.
