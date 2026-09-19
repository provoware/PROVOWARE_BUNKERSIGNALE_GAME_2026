# I07 - Pure Reducer Foundation

## Verbindlicher Scope

I07 führt ausschließlich eine deterministische, seiteneffektfreie Replay-Grundlage ein. Eingaben sind vollständige I06-Event-Envelopes und ein explizites Ruleset. Der resultierende Zustand darf nur von diesen Eingaben abhängen.

Der kleinste funktionale Block ist `tools/pure_reducer.py`: Er startet von `initial_state`, prüft Event-Envelopes, Ruleset-Version, streng steigende Sequenzen und nicht rückläufige Lamport-Zeit und wendet deklarative Payload-zu-State-Zuordnungen an. Unbekannte Event-Typen sind deterministische No-Ops. Eingaben werden nicht mutiert.

## Non-Goals

- Kein IndexedDB Event Store; dieser beginnt erst in I08.
- Keine produktive Persistenz, kein Snapshot Cache und keine Migration.
- Keine Spielregeln, Zufallslogik, Uhrzeitabhängigkeit oder Netzwerkzugriffe.
- Keine Änderung an I00-I06-Freeze-Evidence.
- Keine BUNKER-BLACKBOX-Vorwegnahme.

## I07-Gates

1. Gleiche Events + gleiches Ruleset ergeben byte-/wertgleich denselben Zustand.
2. Fehlgeschlagener Replay liefert keinen partiellen Zustand und verändert weder Events noch Ruleset.
3. Sequenz-, Lamport- und Ruleset-Mismatch werden fail-closed abgewiesen.
4. Static Guard verbietet Zeit, Zufall, Storage/Datei-I/O und Netzwerkzugriffe im Reducer.
5. 1000 Event-Envelopes werden innerhalb eines konservativen 5000-ms-Smoke-Budgets reduziert; die konkrete Laufzeit wird nicht als Produktbudget interpretiert.
6. Repository Quality und realer Chromium-Smoke müssen grün sein.
7. Exakt eine visuelle UX-Änderung: der aktive Tab erhält zusätzlich `font-weight: 700`; keine Navigation oder Interaktionslogik ändert sich.

## Persistenzinvariante

I07 besitzt absichtlich noch keine Persistenz. Die für diesen Checkpoint relevante Invariante lautet daher: Ein Replay veröffentlicht nur den vollständig berechneten Rückgabewert. Bei einem Fehler entsteht kein partieller Rückgabestate und die Eingaben bleiben unverändert. Crash-atomare Speicherung ist explizit I08-Scope.

## Restrisiko

Der deklarative Reducer unterstützt bewusst nur flache Payload-zu-State-Zuordnungen. Das hält I07 klein und deterministisch; komplexere Domainregeln dürfen erst nach einem grünen Freeze mit eigenem Scope ergänzt werden.
