# Vorrelease-Pflichtpaket – I06-kompatible Gameplay-Ereignisentwürfe (24.10.2026)

**Ausgangs-HEAD:** 938689bcd971a89b8d286e30c0ceff9e4e8d5db2 (PR #81). **Arbeitszweig:** agent/gameplay-event-draft-20261024-0237. **Release:** NICHT BEREIT.

## Implementierung und genaue Grenzen

Das neue reine Fachmodul app/domain/gameplay-event-draft.mjs erzeugt aus den bestehenden vier geprüften Aktionen einen **unverbindlichen I06-förmigen Ereignisentwurf**. Es verändert weder Browser noch IndexedDB, I07, I08, I10, I12 oder eingefrorene Nachweise. Die Oberfläche bleibt deaktiviert.

- prepareGameplayEvent(snapshot, command, {event_id, previous_lamport}) validiert den vorgeschlagenen Ereignisbezeichner und die Lamport-Uhr, ruft die bestehende deterministische Projektion auf und gibt nur bei Erfolg einen neuen Entwurf mit event_id, event_type, payload, author_id, sequence, lamport, ruleset_version, metadata und command_id zurück.
- prepareGameplayEventBatch(snapshot, commands, {event_ids, previous_lamport}) prüft Längen, Formate und doppelte Ereignis-IDs; erzeugt bei einem Fehler **keine teilweise veröffentlichte Ereignisfolge oder Zustandskopie**. Jede akzeptierte Aktion erhöht Sequenz und Lamport-Uhr genau einmal.
- Ungültige Eingaben, Duplikate innerhalb des Stapels, alte Sequenzen, doppelte Anfrage-IDs, Sequenz- und Lamport-Überlauf werden abgewiesen. Die Daten sind deterministisch, ohne Zeit-, Zufalls- oder Browserabhängigkeit.

**Wichtige Sicherheitsgrenze:** Das Ergebnis ist **kein autoritatives I06-Event**. Eine übergebene event_id ist nicht als global eindeutig nachgewiesen; previous_lamport ist nicht aus dem autoritativen Eventlog gelesen. Die echte Speicherinstanz muss beide Werte zusammen mit der letzten Welt-Sequenz und request_id **innerhalb einer einzigen IndexedDB-Schreibtransaktion** prüfen und erst dann persistieren. Andernfalls bleiben parallele Schreiber, Neustart, Replay und echte Idempotenz ungesichert. Es gibt weiterhin keine vollständige Spielhandlung, keinen Dialoggraphen und keine automatische Spielstandsspeicherung.

## Nachprüfbare Prüfungen

- Lokal Node 22.16.0: node --test tests/gameplay_event_draft.test.mjs → **11/11 PASS** (Entwicklungsprüfung mit lokal nachgebildeten unveränderten Vorstufen; GitHub-CI prüft den echten Repositorystand).
- Lokal: node --check für neues Fachmodul und Tests → **PASS**.
- GitHub-Workflow prerelease-gameplay-event-draft prüft auf dem PR-HEAD zusätzlich bestehende 12 Befehls- und 11 Projektionsprüfungen, die 11 neuen Entwurfsprüfungen, den I10-Oberflächenfreeze und die 43-Pflichten-Matrix.
- Die allgemeine Quality-CI bleibt wegen SSI-INT-0001/I12-Fingerprint **nicht freigegeben**, solange die formale Bindung fehlt. Keine Änderung an evidence/I12_EVIDENCE.json, status/I12_STATUS.json oder I12-Checkpoint.
- GitHub-Läufe und finaler SHA werden erst nach tatsächlich beendeten Remote-Prüfungen im PR dokumentiert; kein vorweggenommenes PASS.

## Vorrelease-Pflichtmatrix und nächste Implementierung

Normative 43 Einzelpflichten: docs/prerelease_matrix.json; Textschutz: tools/prerelease_requirements.py. **38 OPEN, zwei historische PASS ohne Gültigkeit für diesen HEAD, drei persönliche DEFERRED. Release-seitig 0/43 vollständig nachgewiesen.** GAME-01 bis GAME-04 bleiben OPEN. Die übrigen Pflichten (Content-/Storygraph, vollständige Spielverläufe, Save/Restore, Sicherheit, 800×600, echte Vergrößerung, Tastatur, Performance, Erscheinungsbild, Startbarkeit, Regression und Release-Dokumentation) werden nicht als erledigt markiert.

**Nächster fachlicher Schritt:** getrennt autoritativen I08-Store-Owner und atomaren Welt-Sequenz-/request_id-/event_id-/Lamport-Schutz implementieren, anschließend echte Zwei-Schreiber-, Abort-, Reopen- und Replaytests. Die konkurrierende I12-Fingerprint-Bindung nur über ihren formalen Checkpoint lösen; keine stillen Evidence-Überschreibungen. Danach Story-/Dialogketten und I10-REOPEN unter eigener Freigabe.

**Kein Merge, kein Release, keine persönliche Sicht- oder Kubuntu-Endabnahme vor vollständig grünen technischen Gates und eingefrorenem Kandidaten.**
