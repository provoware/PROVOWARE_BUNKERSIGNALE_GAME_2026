# I12-C – P2-LV Verified Local Signature Evidence Contract

## Zweck

Dieser Contract friert ausschließlich die Application-Grenze ein, mit der ein lokal erzeugter detached Signature Record vor P3 als kryptografisch verifiziert nachgewiesen wird. Noch keine Implementierung.

## Öffentlicher Pfad

Der spätere minimale Orchestrator heißt:

`verifyLocalSignatureEvidence(context, capabilities)`

`context` enthält exakt:
- `worldId`
- `event`
- `chainEntry`
- `i11Verified`
- `signatureRecord`

Zusätzliche Felder sind fail-closed abzulehnen. Insbesondere sind `publicKey`, `keyId` und frei gesetzte Flags wie `verified: true` verboten.

## Capabilities

Erlaubt sind ausschließlich bereits fachlich eingefrorene Wahrheiten:
- `readPublicKeyById(keyId)` – P2-Lookup des historischen Public Keys;
- `importPublicKey(rawPublicKey)` – bestehende I12-B-Importgrenze;
- `verifyEventSignature(context, capabilities)` – bestehende I12-A-Verifikation.

P2-LV darf keine zweite Framing-, Hash-, Author-, I11- oder Ed25519-Logik implementieren.

## Verbindliche Sequenz

1. Context strikt validieren.
2. `signatureRecord.key_id` ausschließlich aus dem unveränderten Record lesen.
3. historischen Public Key über P2 mit genau dieser `key_id` auflösen.
4. dessen kanonische Raw-Bytes über I12-B importieren.
5. I12-A mit unverändertem Record, Event, Welt, Chain Entry, `i11Verified` und importiertem Verify-Key ausführen.
6. nur bei exakt erfolgreicher Verifikation einen nicht frei konstruierbaren Proof an den Aufrufer zurückgeben.

## Proof-Grenze

Der spätere Implementierungsblock MUSS den Erfolgsnachweis als modulprivat erzeugtes, opakes Ergebnis kapseln. Ein Aufrufer darf diesen Nachweis weder über JSON noch über einen freien Boolean herstellen können.

Minimaler Contract:
- Erfolgswert enthält den unveränderten `signatureRecord`;
- Proof-Identität wird ausschließlich innerhalb des P2-LV-Moduls erzeugt;
- eine exportierte Guard-Funktion `isVerifiedLocalSignatureEvidence(value)` darf nur echte, vom Modul erzeugte Erfolgswerte akzeptieren;
- Proof ist nicht serialisierbare Laufzeit-Capability, keine neue persistente Datenstruktur;
- P3 darf später ausschließlich einen durch diese Guard bestätigten Record entgegennehmen.

Damit wird kein neues kryptografisches Format eingeführt. Persistiert wird später weiterhin nur der bereits kanonische detached Signature Record.

## Fail-closed

Folgende Fälle müssen stabil fehlschlagen:
- ungültiger/erweiterter Context;
- fehlende oder zusätzliche Capability;
- unbekannte `key_id`;
- ungültige P2-Key-Daten;
- Importfehler;
- I12-A-Verifikation liefert nicht exakt Erfolg;
- Welt/Event/Author/I11/Chain-Bindung passt nicht;
- mutierter Signature Record;
- frei konstruierter oder serialisierter Fake-Proof.

Kein Fehler darf Persistence auslösen oder einen Proof liefern.

## Freeze-Grenzen

Byteunverändert bleiben:
- `app/application/active-key-registration.js`
- `app/application/registered-event-signature.js`
- `app/application/event-signature.js`
- P1/P2 Infrastructure
- Ed25519 Infrastructure
- DB-Version und Schemas
- I06/I08/I09/I10/I11

## Non-Goals

Keine Implementierung, kein P3 Store, keine DB-/Schemaänderung, keine Rotation, kein Backup/Restore, kein Authenticity Export, keine Actor↔Key-Trust-Persistence, kein UI-/CSS-/DOM-/Asset-Patch und kein REOPEN.

## Exit-Gates

1. Proof kann nicht als freier Boolean oder JSON gefälscht werden.
2. Public-Key-Wahrheit kommt ausschließlich aus P2 per Record-`key_id`.
3. I12-A/B werden wiederverwendet; keine zweite Crypto-Logik.
4. Erfolgswert bindet exakt den unveränderten Record.
5. alle Lookup-/Import-/Verify-/Binding-Fehler sind fail-closed.
6. P3 bleibt gesperrt.
7. kein gefrorener Produktcheckpoint wird verändert.
8. Repository Quality muss vor Freeze grün sein.

## Nächster Schritt

Nach grünem Contract-Freeze ausschließlich den kleinsten P2-LV-Implementierungsblock samt positiven und negativen Contract-Tests umsetzen. Erst nach dessen grünem Freeze darf P3 als Contract Gate eröffnet werden.
