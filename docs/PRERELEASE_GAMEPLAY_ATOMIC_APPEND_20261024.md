# Vorrelease – isolierter atomarer Gameplay-Append (24.10.2026)

**Basis:** PR #82, HEAD `499eb0bdf5b07d53d033773a6ee8152cf2ca3baf`. **Scope:** neue optionale Schreibkomponente und Tests; kein Eingriff in eingefrorenes I08, I07, I10 oder I12.

## Implementierung und Grenzen

`app/infrastructure/browser/gameplay-atomic-append.mjs` bietet `createGameplayAtomicAppender({ indexedDB, dbName, faultInjector }).append(worldId, events, { expected_sequence, previous_lamport })`. Die vorhandene I08-Datenbank muss bereits durch den originalen I08-Adapter angelegt sein; ein fehlender Speicher wird **nicht** automatisch mit einer abweichenden Struktur erzeugt. Eingaben werden vor dem Schreibzugriff geprüft und kopiert. Der Schreiber liest die Weltgeschichte und fügt Ereignisse innerhalb **derselben** IndexedDB-`readwrite`-Transaktion hinzu.

Innerhalb dieser Transaktion werden letzte Weltsequenz, Lamport-Uhr, bisherige `command_id`-Anfragen und Ruleset-Version geprüft. Jeder Stapel muss die Sequenz und Lamport-Uhr lückenlos um genau eins erhöhen. Globale `event_id`-Kollisionen werden zusätzlich vom unveränderten I08-Primärschlüssel abgewiesen. Gleichzeitige Schreibtransaktionen derselben Object-Store-Gruppe werden von IndexedDB serialisiert. Fehler, Duplikate und künstliche Abbrüche hinterlassen keinen Teil-Append; zuvor bestätigte Ereignisse bleiben erhalten.

**Sicherheitsgrenzen:** Die Komponente ist absichtlich **noch nicht** an UI oder Spiellogik angebunden. Der ältere generische I08-Append bleibt unverändert und kann diese zusätzlichen Gameplay-Regeln umgehen; daher ist eine zentrale Schreibhoheit **noch nicht** durchgängig erzwungen. Historische Weltlogs ohne nachweisbare `command_id` oder mit inkonsistenter Sequenz werden sicher abgewiesen statt still repariert. Ein vollständiger I06-Schema- und I07-Replay-Nachweis, die dauerhafte zentrale Schreibhoheit, Speicherplatz-/Absturztests auf mehreren Browsern und die formale I10-REOPEN-Freigabe stehen aus. Der vollständige Weltlog wird aktuell pro Append gelesen (linear pro Schreibvorgang, langfristig ein Leistungsrisiko). **GAME-01 bis GAME-04 bleiben OPEN.**

## Prüfplan und Evidenz

- Node 22.16.0: `node --test tests/gameplay_atomic_append_contract.test.mjs` – 8/8 PASS (lokal, ohne Datenbank).
- `node --check` der neuen Module/Tests – PASS (lokal).
- Echter Chromium-IndexedDB-Lauf: 15 Fälle für fehlenden Store, atomaren Stapel, veraltete Sequenz/Lamport, Request-Replay, globale Event-ID-Kollision, parallele Schreiber, injizierten Abbruch, unklonbare Nutzdaten, Versionswechsel, alte unvollständige Historie, Welttrennung, Reopen und ungültige Stapel.
- GitHub-CI prüft außerdem bestehende Befehls-/Projektions-/Evententwurfs-Tests, I08/I10-Freeze und die 43-Pflichten-Matrix. **Remote-PASS erst nach tatsächlichem Abschluss des Laufs auf dem finalen HEAD.**
- Die bekannte `SSI-INT-0001`-Blockade in I12 bleibt unverändert; eingefrorene Evidence/Status-Fingerprints werden nicht still neu geschrieben.

## Offene Vorrelease-Pflichten

Normative Quelle: `docs/prerelease_matrix.json` mit 43 Anforderungen. Historische PASS sind nicht auf einen neuen Kandidaten übertragbar. `technical_ready=false`, `release_ready=false`, `release_approved=false`. Es fehlen insbesondere die vollständige Spielhandlung mit Story-/Dialoggraph, autoritativer Reducer-Replay, Integration der alleinigen Schreibhoheit, Sicherung/Wiederherstellung über vollständige Spielverläufe, Performance, 800×600/Skalierung, Tastatur, Erscheinungsbild, Dokumentation und alle technischen Gesamtgates.

**Nächste konkrete Arbeit:** I06-Validator und I07-Gameplay-Replay mit dem neuen Writer verbinden, zentrale Schreibhoheit festlegen und Race-/Recovery-Tests auf dem tatsächlich verbundenen Gesamtsystem wiederholen; danach erst I10 formal wieder öffnen. Die I12-Fingerprint-Blockade ausschließlich über den zuständigen Checkpoint beheben. Persönliche Endabnahme gesammelt nach eingefrorenem, technisch vollständig grünem Vorrelease-Kandidaten.

**Kein Merge, kein Release, keine persönlichen Tests vor dem technischen Freeze.**
