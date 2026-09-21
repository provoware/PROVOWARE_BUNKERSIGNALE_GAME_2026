# I12-C – P2-LV Generated Signature Verification Decision

## Zweck

Dieser Decision Gate klärt ausschließlich, ob nach vollständig grünem P2-LI und vor P3 Detached Signature Persistence noch eine weitere verbindliche Application-Grenze erforderlich ist.

**Entscheidung: Ja.** Vor P3 wird ein eigener **P2-LV Generated Signature Verification Barrier** benötigt.

Noch keine Implementierung in diesem Gate.

## Ausgangslage

P2-LI ist grün implementiert und erzwingt:

`P1/P2-L registration → confirmed key_id → signEventDetached(...)`

Damit ist sichergestellt, dass der Signature Record ausschließlich den von P2-L bestätigten `key_id` verwendet.

Die konkrete `signBytes`-Capability bleibt jedoch injiziert. Der Application-Orchestrator kann deshalb allein aus dem erzeugten Signature Record nicht beweisen, dass die verdrahtete Sign-Capability tatsächlich mit dem privaten Schlüssel signiert hat, dessen Public Key unter diesem `key_id` historisch registriert wurde.

## Risiko ohne P2-LV

Eine fehlerhafte Bootstrap-/Capability-Verdrahtung könnte:

1. P2-L korrekt mit Schlüssel A abschließen;
2. den bestätigten `key_id(A)` in den Record übernehmen;
3. `signBytes` versehentlich mit Private Key B ausführen;
4. einen syntaktisch gültigen detached Signature Record erzeugen;
5. diesen später über P3 dauerhaft speichern.

Die Signatur würde bei einer späteren Verifikation zwar fehlschlagen, aber P3 hätte bereits einen lokal erzeugten, kryptografisch inkonsistenten Record persistiert.

P3 soll Persistenzmechanik bereitstellen, nicht diese Application-Konsistenzlücke reparieren.

## Entscheidung

Vor P3 MUSS lokal erzeugte Signature Evidence selbst verifiziert werden.

Verbindliche Sequenz:

1. P2-LI erzeugt den detached Signature Record.
2. Der Record-`key_id` muss weiterhin dem bestätigten Registered-Sign-Pfad entsprechen.
3. Der historische Public Key wird ausschließlich über die bereits eingefrorene P2-Wahrheit für diesen `key_id` bezogen.
4. Die bestehenden I12-Verifikations-Capabilities prüfen Record, Event, Welt, I11-Bindung und Signatur.
5. Nur bei erfolgreichem Verify darf die Application den Record als **verified local signature evidence** an einen späteren P3-Persistenzpfad weitergeben.
6. Verify=false oder jeder Lookup-/Import-/Verification-Fehler blockiert jede spätere Persistenz fail-closed.

## Warum eigener Gate statt P3

P3 soll folgende Verantwortung behalten:

- detached Signature Records speichern/lesen;
- Record-/Index-/No-clobber-/Transaktionsregeln durchsetzen;
- keine CryptoKey-/Signierlogik besitzen;
- keine kryptografische Verifikation als Infrastructure-Nebenwirkung erfinden.

Die Entscheidung, ob ein lokal erzeugter Record vor einem Write kryptografisch akzeptabel ist, gehört in die Application-Schicht.

Damit bleibt die Schichtung:

`Application erzeugt + verifiziert → Infrastructure persistiert`

nicht:

`Infrastructure versucht beim Speichern kryptografische Wahrheit zu erraten`.

## Public-Key-Quelle

Für P2-LV ist der historische Public Key ausschließlich über den P2-`key_id` aufzulösen.

Erlaubt ist sinngemäß:

`publicKeyStore.readById(record.key_id)`

Danach werden die kanonischen 32 Raw-Bytes über die bestehende I12-B-Import-Capability in einen Verify-`CryptoKey` überführt.

Nicht erlaubt:

- Public Key frei vom Aufrufer mitgeben;
- Public Key direkt aus P1 als historische Wahrheit übernehmen;
- Netzwerk-/Backup-Lookup;
- Record-`key_id` ohne P2-Auflösung akzeptieren.

## Verifikationsgrenze

P2-LV MUSS die bestehende I12-A-Verifikation wiederverwenden.

Die Verifikation darf keine zweite Signatur-/Framing-/Author-/I11-Logik erfinden.

Mindestens müssen weiterhin gelten:

- `world_id` passt;
- `event_id` passt;
- `author_id` passt;
- I11 ist erfolgreich und wird wie bereits eingefroren erneut an Event/Chain gebunden;
- Signature Record ist kanonisch;
- P2-Key ist auflösbar;
- Ed25519-Verifikation liefert exakt `true`.

## Ergebnissemantik

Dieser Decision Gate führt noch keinen neuen Produktdatentyp ein.

Der spätere Contract Gate muss jedoch festlegen, wie ein erfolgreicher P2-LV-Schritt einem späteren P3-Pfad beweist, dass genau **dieser** unveränderte Record verifiziert wurde, ohne einen fälschbaren freien Boolean wie `verified: true` zu akzeptieren.

Diese Proof-/Capability-Grenze ist Teil des nächsten Contract Gates.

## Non-Goals

- keine P2-LV-Implementierung;
- kein P3 Signature Store;
- keine DB-/Schemaänderung;
- keine Änderung an P1, P2, P2-L oder P2-LI;
- keine Rotation;
- keine Backup-/Restore-Erweiterung;
- kein Authenticity Export;
- keine Trusted-Checkpoint-Persistence;
- keine Actor↔Key-Trust-Persistence;
- keine UI-/CSS-/DOM-/Asset-Änderung;
- kein I08-/I10-REOPEN.

## Freeze-Grenzen

Byteunverändert bleiben:

- `app/application/active-key-registration.js`
- `app/application/registered-event-signature.js`
- `app/application/event-signature.js`
- P1/P2 Infrastructure
- Ed25519 Infrastructure
- DB-Version/Schemas
- bestehende I12-A/B/P1/P2/P2-L/P2-LI Tests
- I06/I08/I09/I10/I11

## Exit-Gates

1. P2-LV als verpflichtender Pre-P3-Gate dokumentiert.
2. lokal erzeugte Signaturen müssen vor Persistenz kryptografisch verifiziert werden.
3. Public-Key-Wahrheit kommt ausschließlich aus P2 per `key_id`.
4. bestehende I12-A/B-Verifikation wird wiederverwendet; keine zweite Crypto-Logik.
5. Verify=false/Lookup-/Import-/Crypto-Fehler blockieren spätere Persistenz.
6. P3 bleibt weiterhin gesperrt.
7. kein Produkt-, DB-, Schema-, UI- oder Testcode verändert.
8. I08/I10 bleiben geschlossen.
9. Repository Quality nach Evidence-Neubindung grün.
10. finaler Diff ausschließlich Masterplan/Decision/VW-006/Change Record/Evidence/Status.

## Nächster Schritt

Nach grünem Freeze ausschließlich den **P2-LV Contract Gate – Verified Local Signature Evidence** eröffnen.

Erst nach grünem P2-LV-Implementierungs-Freeze darf P3 Detached Signature Persistence als Contract Gate eröffnet werden.
