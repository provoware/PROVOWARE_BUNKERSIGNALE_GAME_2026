# VW-005 – Licht- und Atmosphärenhierarchie

## Einziger Aspekt dieser Iteration

Nur die **hierarchische Licht- und Atmosphärenlogik** der bereits geplanten Bunkeransicht wird festgelegt. Keine Runtime-Beleuchtung, Shader, Wetteranimation, Partikelsysteme, Assets, Figuren oder Gameplay-Interaktion.

## Ziel

Licht und Atmosphäre sollen drei Aufgaben gleichzeitig erfüllen:

1. den riesigen Bunker als Hauptmotiv lesbar halten;
2. den Haupteingang und die in VW-003 definierten Wege räumlich führen;
3. Verlassenheit, Feuchtigkeit und industrielle Schwere vermitteln, ohne wichtige Bereiche in dekorativer Dunkelheit zu verlieren.

## Hierarchie

### Ebene 1 – Bunker und Haupteingang

Die Bunkerfront bleibt die stärkste Masse im Bild. Der Haupteingang erhält den klarsten Hell-Dunkel-Kontrast der Architektur, ohne als künstlich leuchtender Marker zu wirken.

Die Eingangstiefe darf dunkler sein als die Fassade, aber:
- Kontur und Öffnungsgröße bleiben erkennbar;
- der direkte Zugangskorridor verschwindet nicht im Schwarz;
- keine Gameplay-Information hängt allein vom Helligkeitsunterschied ab.

### Ebene 2 – Vorfeld und Hauptachse

Das Vorfeld erhält ausreichend diffuse Grundhelligkeit, damit:
- zentrale Hauptachse,
- linke Logistikachse,
- rechte Service-Achse,
- Ausbauzonen

auch ohne aktive Lampen oder Farbcodes räumlich lesbar bleiben.

Die Hauptachse darf durch Blickrichtung und graduelle Helligkeitsführung unterstützt werden, aber nicht als leuchtender Pfad erscheinen.

### Ebene 3 – Rand- und Hintergrundbereiche

Seitliche Reserveflächen und Hintergrund dürfen atmosphärisch zurücktreten.

Dabei gilt:
- weniger Kontrast als am Hauptmotiv;
- keine vollständig informationslosen schwarzen Flächen;
- Fernsilhouette bleibt nur als ruhiger Tiefenanker vorgesehen;
- VW-006 entscheidet später erst ihre konkrete Landmarkenform.

## Grundatmosphäre

Die Szene ist kühl, schwer und feucht wirkend, aber nicht monochrom vorgeschrieben.

Atmosphärische Hinweise dürfen später umfassen:
- diffuse Bewölkung;
- feuchte Luft / leichte Distanzstreuung;
- dunklere geschützte Bereiche;
- aufgehellte offene Horizontzone.

Dieser Plan legt keine konkrete Tageszeit oder Wetteranimation fest.

## Lichtquellen-Logik

Spätere künstliche Lichtquellen müssen kausal sein:
- vorhandene technische Restbeleuchtung nur, wenn Energiequelle/Story dies erklärt;
- Spieleraufbauten dürfen später eigene lokale Lichtinseln erzeugen;
- keine dekorativen Lampen ohne bauliche oder funktionale Herkunft;
- keine Neon-/Warnfarbe als alleinige Navigation.

## Materialbezug zu VW-004

Licht unterstützt Materiallogik, ersetzt sie aber nicht:
- feuchte Betonbereiche können lokal weniger diffus wirken;
- Metallkanten dürfen gezielte Reflexe tragen;
- Asphalt-/Betonflächen bleiben in ihrer Wegefunktion geometrisch lesbar;
- Rost und Alterung dürfen nicht durch übermäßigen Kontrast zum Hauptmotiv werden.

## Tiefenstaffelung

Vordergrund, Mittelgrund und Hintergrund werden primär durch:
- Kontrastabnahme,
- Detailreduktion,
- atmosphärische Distanz

gestaffelt.

Starke künstliche Tiefenunschärfe ist nicht Bestandteil dieses Plans.

## Accessibility / Lesbarkeit

- entscheidende Wege und Zugänge bleiben auch bei reduziertem Kontrast verständlich;
- keine Information ausschließlich über Farbe oder Leuchten;
- keine pulsierenden/flackernden Lichtquellen als Pflichtsignal;
- spätere Animation muss `prefers-reduced-motion` respektieren;
- 200-%-Zoom darf keine überstrahlten oder vollständig abgesoffenen Hauptbereiche erzeugen.

## Performance-Grenze

Dieser Plan autorisiert keine dynamische Beleuchtungsengine.

Bei späterer Umsetzung:
- möglichst wenige visuelle Licht-Layer;
- statische/gradientenbasierte Lösungen bevorzugen, solange sie die gewünschte Hierarchie tragen;
- Blur-/Filterkosten messen;
- keine hochfrequenten Vollbildanimationen;
- keine externe Runtime-Abhängigkeit.

## Akzeptanzkriterien

- Bunkerfront bleibt stärkstes räumliches Hauptmotiv;
- Haupteingang ist durch Form plus Kontrast erkennbar, nicht durch Farbe allein;
- alle drei VW-003-Wegeachsen bleiben lesbar;
- Material-/Alterungslogik aus VW-004 bleibt sichtbar, ohne visuell zu dominieren;
- Vorder-, Mittel- und Hintergrund sind atmosphärisch unterscheidbar;
- Dunkelheit erzeugt Stimmung, verdeckt aber keine strukturell wichtige Zone;
- keine konkrete Wetter-, Tageszeit-, Landmarken- oder Gameplayentscheidung wird vorgezogen.

## Non-Goals

Keine konkrete Tageszeit, keine Wetteranimation, keine Partikel, keine Fernlandmarken (VW-006), keine UI-Integration (VW-007), keine Runtime-Lichter und kein CSS-/DOM-/Shader-/Asset-Patch.
