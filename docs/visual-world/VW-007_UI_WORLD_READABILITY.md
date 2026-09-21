# VW-007 – UI↔Spielwelt-Lesbarkeit

## Einziger Aspekt dieser Iteration

Nur die visuelle Trennung und Lesbarkeit zwischen späterer Bedienoberfläche und der geplanten Bunker-Spielwelt wird festgelegt. Keine Runtime-UI, kein CSS-/DOM-/Asset-Patch und keine neue Interaktion.

## Ziel

Die Welt bleibt atmosphärisch, während Bedienelemente jederzeit als Bedienebene erkennbar sind. Text, Fokus und Status dürfen weder in Beton-/Nebelstrukturen verschwinden noch durch dekorative Weltkontraste überstrahlt werden.

## Lesbarkeitshierarchie

1. Bedienkritischer Text und Fokus stehen immer vor Weltdekor.
2. Interaktive Flächen benötigen eine ruhige, lokal kontraststabile Unterlage.
3. Bunker, Eingang und Wege bleiben hinter UI-Flächen räumlich verständlich, werden dort aber visuell gedämpft.
4. Fernlandmarken aus VW-006 dürfen nie wie UI-Badges, Marker oder Buttons wirken.

## Abgrenzung

Spätere UI-Flächen sollen durch Form, Abstand und lokale Helligkeitsruhe erkennbar sein – nicht ausschließlich durch Farbe. Transparenz darf Atmosphäre erhalten, aber keine Textur direkt unter Fließtext oder Primäraktionen durchschlagen lassen.

## Accessibility

- 200-%-Zoom darf keine wichtige Welt- oder Bedieninformation gegenseitig verdecken;
- Fokus bleibt eindeutig und nicht nur farbcodiert;
- Statusinformationen erhalten Text/Symbolik zusätzlich zu Farbe;
- reduzierte Bewegung bleibt respektiert;
- dekorative Weltbewegung darf Fokus, Lesen oder Zeigerverfolgung nicht stören.

## Performance-Grenze

Keine Blur-Pflicht, keine Shader-Abhängigkeit und keine großen Masken-/Rasterassets. Die spätere Umsetzung soll mit einfachen Flächen, Tokens und wenigen Layern funktionieren.

## Akzeptanzkriterien

- UI und Welt sind ohne Farbwissen unterscheidbar;
- Text liegt auf kontraststabilen Flächen;
- Fokus bleibt bei 100–200 % Zoom klar;
- VW-001 bis VW-006 bleiben räumlich und atmosphärisch gültig;
- keine Landmarke wirkt wie ein aktives UI-Signal;
- keine Runtime-Funktion wird vorgezogen.

## Non-Goals

Kein UI-Redesign, keine Navigation, keine neue Komponente, keine Interaktion, kein CSS-/DOM-/Asset-Patch, keine Spielmechanik und kein REOPEN.
