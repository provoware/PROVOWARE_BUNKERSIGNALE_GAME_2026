# GAME-01 bis GAME-04 – isolierte Spielzustandsvorschau (23.10.2026)

**Ausgangs-HEAD:** `8fd1e1785a6ed7b2a58a6b761752f4047d2ab0e2` (Entwurfs-PR #80). **Scope:** nur neuer reiner Fachbaustein, Regressionstests, eigene GitHub-Prüfkette und Nachweise. I07, I08, I10, I12, bestehende Spielstände und eingefrorene Evidence bleiben unverändert.

## Vertrag und Grenzen

`app/domain/gameplay-projection.mjs` importiert den bestehenden, seiteneffektfreien Vorfilter `decideGameplayCommand`. `projectGameplayCommand(snapshot, command)` liefert entweder einen stabilen Fehlercode oder eine **unverbindliche, neue** `next_state`-Kopie samt bisherigem Event-Vorschlag. Die ursprünglichen Eingaben werden nicht verändert.

- **Untersuchen:** erzeugt nur den vorgeschlagenen Ereignistyp, merkt die Anfrage und erhöht die vorläufige Sequenz.
- **Reden:** prüft die freigegebene Dialogoption; ein echter Dialoggraph oder dessen Storyfolge existiert noch nicht.
- **Inventar/Aufnehmen:** fügt das Objekt nur der vorläufigen Inventarliste hinzu. Besitz und Kapazität werden beim nächsten Befehl erneut geprüft.
- **Weiter:** aktualisiert den aktuellen Sektor **und** den Sektor der aktiven Figur; nachfolgende Erreichbarkeitsprüfungen sehen diesen Wechsel.
- Jede erfolgreiche Vorschau merkt die Anfrage-ID und erhöht die Sequenz um genau eins. Sequenzüberlauf wird abgewiesen.

`previewGameplayCommands(initialSnapshot, commands)` prüft eine Folge in Reihenfolge. Bei einem Fehler liefert es ausschließlich Fehlercode und Befehlsposition, **keinen teilweise fortgeschriebenen Zustand**. Leere/ungültige Befehlsfolgen werden abgewiesen.

**Sicherheitsgrenze:** Diese Vorschau ist **weder** ein vollständiges I06-Event **noch** der autoritative I07-Reducer oder ein I08-Speichervorgang. Sie besitzt keine dauerhafte Idempotenz und keinen Schutz gegen gleichzeitige Schreiber. Ein realer Event-Store muss Sequenz und Anfrage-ID **innerhalb derselben atomaren Schreibtransaktion** erneut prüfen; sonst dürfen die Vorschläge nicht persistiert werden. Kein UI-Schalter wird aktiviert, weil I10 eingefroren ist.

## Prüfungen und offene Pflichten

Lokal ausführbar:

```sh
node --check app/domain/gameplay-projection.mjs
node --test tests/gameplay_command.test.mjs tests/gameplay_projection.test.mjs
python3 tools/prerelease_gate.py
```

Die neuen zehn Testgruppen decken Determinismus, vier Aktionen, keine Mutation, Replay, Duplikate, veraltete Sequenzen, Überlauf und Fehler ohne Teilzustand ab. GitHub führt die Tests im eigenen Workflow `prerelease-gameplay-projection` zusätzlich zur unveränderten Quality-Prüfung aus.

**Vorrelease:** GAME-01 bis GAME-04 bleiben OPEN; die maschinenlesbare 43-Pflichten-Matrix wird nicht auf PASS gesetzt. Auch die übrigen Pflichten (Content-/Storygraph, echte Ereignisse, Persistenz/Recovery, Browser- und Tastaturtests, Performance, Startbarkeit und Release-Nachweise) sind weiterhin eigenständig zu erfüllen. Die bekannte I12-Fingerprint-Störung `SSI-INT-0001` bleibt ein rotes Qualitätsgate und darf nicht umgangen werden.

**Nächste konkrete Implementierung:** I06-Envelope-Adapter mit stabiler Event-ID, Event-Replay und formalem I08-Store-Owner entwerfen; danach atomare Sequenz-/Request-ID-Prüfung mit zwei konkurrierenden Schreibern, Abort, Neustart und Replay testen. Storyfolgen und UI erst nach gesonderter Freigabe/REOPEN der jeweiligen Checkpoints integrieren.

**Kein Merge, kein Release, keine persönliche Endabnahme.**
