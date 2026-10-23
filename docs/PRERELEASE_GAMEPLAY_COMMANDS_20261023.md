# GAME-01 bis GAME-04: isolierter Befehls-Vorfilter (23.10.2026)

**Ausgangs-HEAD:** `585c2ff3de81243e10eae77488c0c215b30fc2f2` (PR #79).
**Änderungsumfang:** ausschließlich neuer reiner Domain-Baustein, zwölf Negativ-/Determinismustests, eigener GitHub-Testlauf und dieser Nachweis. Kein Eingriff in I10-Oberfläche, I07-Reducer, I08-Eventstore, I12-Signaturen, bestehende Spielstände oder gefrorene Nachweise.

## Implementierte Teilfunktion (noch kein spielbares Gameplay)

`app/domain/gameplay-command.mjs` exportiert `decideGameplayCommand(command, snapshot)`. Ein Befehl ist eine Absicht mit exakt `world_id`, `actor_id`, `action`, `target_id`, `expected_sequence`, `ruleset_version`, `request_id`; für `talk` zusätzlich `option_id`. Vier Aktionen sind `inspect`, `talk`, `take`, `move`. Die Kennungen folgen den festgelegten Welt-/Figur-/Objektklassen; Sektoren nutzen `sector:<slug>`, Dialogoptionen `dialogue:<slug>`, Anfragen `req:<24 hex>`.

Das Weltabbild enthält ausdrücklich Welt/Version/Sequenz, aktuellen Sektor, aktive Figur, erreichbare Figuren, Objekte, Routen, Inventar, Kapazität und bekannte Anfragen. Ungültige Daten, doppelte IDs, unerreichbare Ziele, gesperrte Routen, fehlende Dialogoptionen, volles Inventar, veraltete Sequenzen und wiederholte Anfragen werden **ohne Seiteneffekt** mit stabilen Fehlercodes zurückgewiesen.

Erfolg liefert nur einen **Event-Vorschlag** mit Typ, Nutzdaten, Autor, Version und Befehlskennung. Er enthält absichtlich **keine** Event-ID, Sequenz oder Lamport-Zeit und darf nicht als I06-Envelope gespeichert werden. Der autorisierte Store muss vor dem atomaren Anhängen die Sequenz und die Anfrage-ID erneut prüfen; dieser Schutz ist noch **nicht** implementiert. Das Weltabbild ist eine vorläufige, explizite Testeingabe und noch kein freigegebenes Contentpaket. Eine Dialogentscheidung wird validiert, aber noch nicht in einen neuen Dialogzustand überführt.

## Nachweise und Grenzen

- `node --check app/domain/gameplay-command.mjs`
- `node --test tests/gameplay_command.test.mjs` (12 Testgruppen mit Positiv-/Negativfällen und 1000 identischen Vorprüfungen).
- `python3 -m unittest discover -s tests -p test_i10_ui_shell.py -v` schützt die eingefrorene, deaktivierte Spieloberfläche.
- `python3 tools/prerelease_gate.py` bleibt ohne Release-Freigabe.
- `python3 tools/run_i00_checks.py` ist bis zur regulären I12-Fingerprint-Bindung voraussichtlich **FAIL** (SSI-INT-0001). Keine Änderung oder Umgehung von `evidence/I12_EVIDENCE.json` und `status/I12_STATUS.json`.

**Pflichtmatrix:** GAME-01 bis GAME-04 bleiben **OPEN**. Der reine Vorfilter erfüllt nur einen Teil des Vertrags. Weiterhin fehlen Contentgraph, Evententscheidung, Replay, atomare Anfrage-Idempotenz, echte Speicherfehler- und Langzeitdurchläufe sowie formal dokumentiertes I10-REOPEN mit anschließender UI-Anbindung. Auch 800×600, 200 % Skalierung und vollständige Tastatur-/Spieltests müssen auf dem finalen Kandidaten erneut belegt werden.

**Nächste Implementierung:** versionierte, gesperrte Test-Weltfixture und deterministische Evententscheidung mit I06-Envelope-Adapter entwickeln; den Store-Owner und eine atomare Anfrage-ID-Prüfung festlegen, danach Race-/Abort-/Replaytests. Erst bei grünen Gates die vier UI-Aktionen schrittweise freigeben. Kein Merge, kein Release und keine persönliche Endabnahme.
