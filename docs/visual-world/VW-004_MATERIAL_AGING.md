# VW-004 – Material- und Alterungslogik

## Einziger Aspekt

Nur die Material- und Alterungslogik der bereits festgelegten Bunkerfront, Vorfeldflächen und Wegeachsen wird definiert. Keine Beleuchtung, Wetteranimation, Fernsilhouette, UI, Runtime-Assets oder Gameplay-Logik.

## Materialhierarchie

- **Bunkerhauptkörper:** grober Stahlbeton; große ruhige Flächen bleiben erhalten, damit die monumentale Form aus VW-002 lesbar bleibt.
- **Tore/technische Elemente:** Stahl mit lokaler Oxidation an Kanten, Fugen und Wasserwegen; Rost ist Akzent, keine flächige Tarntextur.
- **Vorfeld/Hauptachse:** gealterte versiegelte Fläche mit Rissen, Abrieb und reparierten Teilflächen; die dominante Achse aus VW-003 bleibt geometrisch erkennbar.
- **Nebenachsen:** ähnliche Materialfamilie, aber stärker gebrochen und überwachsen, ohne ihre funktionale Trennung allein über Farbe zu codieren.
- **Randzonen:** Erde, Schutt und Vegetationsdurchbruch nehmen nach außen zu und markieren den Übergang zur verlassenen Umgebung.

## Kausale Alterung

Alterung folgt nachvollziehbaren Ursachen statt zufälligem Noise:

1. Wasserlauf erzeugt dunklere Feuchte-/Auswaschungszonen und lokale Oxidation.
2. Mechanische Nutzung erzeugt Abrieb an Toren, Fahrspuren, Kanten und früheren Ladeflächen.
3. Frost/Setzung erzeugt Risse bevorzugt an Fugen und gebrochenen Vorfeldflächen.
4. Vegetation dringt zuerst an Rissen, Randfugen und wenig genutzten Nebenflächen ein.
5. Geschützte Vertiefungen altern anders als exponierte Flächen.

## Lesbarkeitsregel

Materialdetails dürfen weder die Eingangshierarchie aus VW-002 noch die Wegeachsen aus VW-003 überdecken. Primäre Formen müssen auch ohne Textur und ohne Farbinformation verständlich bleiben.

## Performance-Regel

Bis zu einem eigenen Asset-Pipeline-Gate bleibt VW-004 reine Planung. Keine großen Rastertexturen, Shader-Abhängigkeiten oder externen Assets werden eingeführt.

## Akzeptanzkriterien

- Beton, Stahl, versiegeltes Vorfeld und Randzonen besitzen unterscheidbare, kausal begründete Alterung;
- Schäden konzentrieren sich an physikalisch plausiblen Stellen;
- Hauptzugang und Hauptachse bleiben visuell dominant;
- Materialunterschiede sind nicht die einzige Information zur Orientierung;
- VW-001 bis VW-003 werden räumlich nicht verändert;
- keine Beleuchtungsentscheidung aus VW-005 wird vorgezogen.

## Non-Goals

Keine Licht-/Atmosphärenhierarchie (VW-005), keine Fernsilhouette (VW-006), keine UI↔Welt-Integration (VW-007), keine Animation, keine aktiven Bauplätze und kein CSS-/DOM-/Asset-Patch.
