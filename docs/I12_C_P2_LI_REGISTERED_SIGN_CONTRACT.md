# I12-C – P2-LI Registered Sign Path Contract

## Zweck

Dieser Contract Gate friert ausschließlich den minimalen Application-Vertrag ein, der die grün implementierte P2-L Registration Barrier untrennbar vor die bestehende detached Signaturerzeugung setzt. Noch keine Implementierung und keine Signature-Persistence.

## Öffentliche Funktion

Geplant ist exakt:

`signEventWithRegisteredActiveKey(context, capabilities)`

### `context`

Erlaubt sind ausschließlich die bereits für I12-A/I11 erforderlichen Signaturdaten:

- `worldId`
- `event`
- `chainEntry`
- `i11Verified`

`keyId` ist im öffentlichen Context ausdrücklich verboten. Der verwendete `key_id` stammt ausschließlich aus der erfolgreichen P2-L-Barriere.

### `capabilities`

Der Orchestrator erhält ausschließlich injizierte Capabilities:

- `signingKeyStore`
- `publicKeyStore`
- `exportPublicKey`
- `deriveKeyId`
- `signBytes`
- `canonicalEventBytes`
- `sha256Hex`

Keine direkte Browser-, IndexedDB- oder UI-Abhängigkeit.

## Verbindlicher Call-Trace

1. `ensureActiveSigningKeyRegistered(...)`
2. dessen bestätigten `key_id` übernehmen
3. Signatur-Context intern um genau diesen `key_id` ergänzen
4. `signEventDetached(...)` aufrufen
5. dessen detached Signature Record unverändert zurückgeben

`register-barrier → confirmed key_id → sign`

Bei jedem Fehler der Registration Barrier muss `signEventDetached(...)` beziehungsweise `signBytes` **0-mal** aufgerufen werden.

## Fehleroberfläche

- P2-L-Fehler werden unverändert als bestehende `ActiveKeyRegistrationError`-Codes durchgereicht; kein zweiter Fehlerkatalog für dieselbe Ursache.
- Fehler aus I12-A/Sign-Capability bleiben deren bestehende stabile Fehleroberfläche.
- Der Orchestrator darf Ursachen nicht verschlucken, umdeuten oder als Erfolg behandeln.

## Rückgabewert

Ausschließlich der von `signEventDetached(...)` erzeugte und validierte `ssi-event-signature`-Record. Keine zusätzliche Persistenzmetadaten, kein Store-Status und kein privates Schlüsselmaterial.

## Sicherheitsinvarianten

- kein externer `key_id`;
- kein Signieren vor erfolgreicher P2-L-Registrierung;
- bestätigter P2-L-`key_id` ist der einzige Signatur-Key-Bezug;
- kein Signature-Store-Write;
- keine Mutation von Event, I11-Kette, P1 oder P2 außer dem bereits erlaubten idempotenten P2-`putIfAbsent` innerhalb P2-L;
- kein Logging privaten Schlüsselmaterials.

## Minimale Contract-Tests für die spätere Implementierung

1. Erfolgsfall beweist Trace `register → sign`.
2. Signaturrecord enthält exakt den von P2-L bestätigten `key_id`.
3. fehlender aktiver Key: Sign-Aufruf 0-mal.
4. Public-Key-Exportfehler: Sign-Aufruf 0-mal.
5. `key_id`-Ableitungsfehler: Sign-Aufruf 0-mal.
6. `key_id`-Mismatch: Sign-Aufruf 0-mal.
7. P2-Registrierungsfehler: Sign-Aufruf 0-mal.
8. öffentlicher Context mit `keyId` wird fail-closed abgewiesen statt ignoriert.
9. Signaturfehler werden nicht als Registration-Erfolg umgedeutet.
10. kein Signature-Persistence-Write existiert im Modul.

## Non-Goals

- keine Implementierung in diesem Gate;
- kein P3 Signature Store;
- keine DB-/Schemaänderung;
- keine Rotation;
- kein Backup/Restore;
- keine Trusted-Checkpoint-Persistence;
- kein Actor↔Key-Trust-Store;
- keine UI-/CSS-/DOM-/Asset-Änderung;
- kein I08-/I10-REOPEN.

## Freeze-Grenzen

Byteunverändert bleiben Produktcode, P1/P2 Infrastructure, DB-Schema, I12-A/B/P1/P2/P2-L sowie I06/I08/I09/I10/I11.

## Exit-Gates

1. öffentliche Signatur und erlaubter Context sind eindeutig;
2. externer `keyId` ist verboten;
3. Capability-Injection vollständig definiert;
4. Trace `register → confirmed key_id → sign` ist verbindlich;
5. jeder P2-L-Fehler blockiert Signieren;
6. keine Signature-Persistence;
7. keine Produkt-/DB-/Schema-/UI-/Testcodeänderung;
8. I08/I10 bleiben geschlossen;
9. P3 bleibt bis zum grünen P2-LI-Implementierungs-Freeze gesperrt;
10. Repository Quality nach Evidence-Neubindung grün.

## Nächster Schritt

Nach grünem Contract-Freeze ausschließlich den kleinsten P2-LI-Application-Orchestrator samt Contract-Tests implementieren. P3 bleibt gesperrt.
