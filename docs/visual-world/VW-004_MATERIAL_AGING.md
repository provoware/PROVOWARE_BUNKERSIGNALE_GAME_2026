# VW-004 – Material- und Alterungslogik von Bunker und Vorfeld

## Einziger Aspekt dieser Iteration

Nur die **Materialfamilien und ihre kausale Alterungslogik** werden festgelegt. Keine Beleuchtungsfarbe, Wetteranimation, Vegetationssimulation, Figuren, Bauobjekte, Runtime-Assets oder Interaktionslogik.

## Ziel

Bunker und Vorfeld sollen nicht wie zufällig „dreckige“ Oberflächen wirken. Jeder Materialzustand muss aus Nutzung, Witterung, Feuchtigkeit, mechanischer Belastung oder aufgegebener Wartung erklärbar sein.

## Materialfamilien

### Stahlbeton

Primär für:
- Bunkerhauptkörper,
- massive Stützwände,
- Rampen-/Kantenbereiche.

Alterungslogik:
- großflächig matt und mineralisch;
- Wasserlaufspuren vor allem unter Fugen, Kanten und Entwässerungspunkten;
- Abplatzungen konzentrieren sich an exponierten Kanten und geschädigten Bereichen;
- sichtbare Bewehrung nur lokal, nicht flächendeckend;
- keine gleichmäßig verteilten „Grunge“-Flecken ohne Ursache.

### Stahl

Primär für:
- Tore,
- technische Türen,
- Geländer,
- Beschläge,
- Lüftungs-/Serviceelemente.

Alterungslogik:
- Oxidation beginnt bevorzugt an Fugen, Schraubpunkten, unteren Kanten und beschädigten Beschichtungen;
- große Metallflächen behalten erkennbare Restflächen früherer Schutzbeschichtung;
- bewegliche/geschützte Zonen können weniger stark gealtert sein als frei bewitterte Teile;
- Rost darf Maßstab und Kontur nicht unlesbar machen.

### Asphalt / schwere Verkehrsfläche

Primär für:
- zentrale Zuführung,
- linke Logistikachse,
- belastete Vorfeldbereiche.

Alterungslogik:
- Risse folgen Belastung, Setzung und Entwässerung;
- frühere Fahrspuren dürfen subtil erkennbar bleiben;
- Kanten zerfallen stärker als zentrale belastete Flächen;
- Reparaturflicken können frühere Nutzung andeuten, ohne bereits Gameplay-Funktion zu behaupten.

### Betonplatten / technische Hofflächen

Primär für:
- rechte Service-/Technikzone,
- Randflächen an Zugängen,
- frühere Wartungsbereiche.

Alterungslogik:
- Fugen bleiben geometrisch lesbar;
- lokale Absenkung, Ausbrüche und Verschmutzung stärker an Arbeits-/Entwässerungspunkten;
- keine vollständige Zerstörung, damit spätere Wiederverwendung plausibel bleibt.

## Feuchte- und Wasserlogik

Feuchtigkeit folgt Geometrie:
- unter horizontalen Kanten;
- an tiefen Punkten;
- entlang von Fugen;
- bei Entwässerungsresten;
- im Sockelbereich nahe Erd-/Schuttkontakt.

Dunklere oder stärker gealterte Flächen dürfen nicht willkürlich verteilt werden.

## Nutzungs- versus Verfallszonen

Drei Zustände müssen unterscheidbar bleiben:

1. **ehemals stark genutzt:** mechanischer Abrieb, Reparaturspuren, belastete Fahr-/Arbeitsflächen;
2. **geschützt/technisch:** strukturierter, lokal besser erhalten;
3. **lange ungewartet:** Feuchte, Oxidation, Kantenzerfall und Ablagerungen stärker sichtbar.

Diese Unterscheidung unterstützt Storytelling ohne Textlabels.

## Anschluss an VW-001 bis VW-003

- VW-001-Komposition bleibt unverändert.
- VW-002-Form und Eingangshierarchie bleiben ausschließlich geometrisch definiert.
- VW-003-Wegeachsen bleiben über Breite und Freiraum lesbar; Materialien dürfen ihre Hierarchie nur unterstützen, niemals ersetzen.

Die zentrale Hauptachse erhält daher keine exklusive Farbcodierung. Linke Logistik- und rechte Serviceflächen dürfen über unterschiedliche Belastungs-/Reparaturmuster unterstützt werden, müssen aber auch ohne Textur unterscheidbar bleiben.

## Accessibility / Lesbarkeit

- Materialunterschiede sind ergänzend, nie einzige Information.
- starke Kleintextur darf bei 200-%-Zoom keine visuelle Unruhe erzeugen.
- wichtige Konturen, Wege und Zugänge behalten ausreichende Formtrennung.
- keine flackernden oder bewegten Alterungseffekte.

## Performance-/Asset-Grenze

Dieser Plan autorisiert noch keine hochauflösenden Rastertexturen oder neue Runtime-Assets.

Bei späterer Umsetzung gelten:
- wiederverwendbare Materialfamilien statt vieler Einzeltexturen;
- bevorzugt kleine tiling-fähige Basen plus sparsame lokale Variationen;
- Asset-Größe und Draw-/Layer-Kosten vor Integration messen;
- keine externe Runtime-Abhängigkeit.

## Akzeptanzkriterien

- jede Alterung lässt sich kausal einer Materialeigenschaft oder Nutzung/Witterung zuordnen;
- Beton, Stahl, Asphalt und technische Betonflächen besitzen unterscheidbare Alterungsmuster;
- Wasser-/Feuchtespuren folgen nachvollziehbarer Geometrie;
- monumentale Bunkerform aus VW-002 bleibt trotz Alterung klar lesbar;
- Wegeachsen aus VW-003 bleiben auch ohne Material/Farbe verständlich;
- keine spätere Licht-, Wetter-, Vegetations- oder Gameplayentscheidung wird vorgezogen.

## Non-Goals

Keine Licht-/Atmosphärenhierarchie (VW-005), keine Landmarken/Fernsilhouette (VW-006), keine UI-Integration (VW-007), keine Vegetationslogik, keine Wetteranimation und kein CSS-/DOM-/Asset-Patch.
