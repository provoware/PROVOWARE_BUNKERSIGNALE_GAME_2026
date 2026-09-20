# I12-C – P2 Historical Public-Key Retention Contract

## Zweck

P2 definiert ausschließlich den Vertrag für die **historische, unveränderliche Aufbewahrung öffentlicher Ed25519-Schlüssel**. Dieser Block implementiert noch keinen IndexedDB-Code.

P2 ist die notwendige Voraussetzung für P3: Ein persistierter detached Signature Record ist nur dauerhaft sinnvoll verifizierbar, wenn sein `key_id` auch später zuverlässig zu den damaligen Public-Key-Bytes aufgelöst werden kann.

## REOPEN / Freeze

**I12 bleibt ausschließlich für I12-C/P2 geöffnet.**

**Kein I08-/I10-REOPEN.** I06-Events, I08 Event Store, I09 Snapshot Cache und I10 World Backup/Restore bleiben unverändert.

P1 ist gefroren. Insbesondere bleiben `app/infrastructure/browser/indexeddb-signing-key-store.js`, der Store `signing_keys` und seine Semantik unverändert.

## Kanonische Public-Key-Repräsentation

Die historische Wahrheit eines P2-Public-Keys sind exakt:

- **32 rohe Ed25519-Public-Key-Bytes**,
- im Runtime-Vertrag als `Uint8Array`,
- ohne SPKI-/PEM-/JWK-Wrapper,
- ohne Base64/Base64url als Storage-Wahrheit,
- ohne `CryptoKey` als historische Storage-Wahrheit.

Begründung: Die bereits eingefrorene I12-`key_id`-Ableitung verwendet exakt diese 32 rohen Bytes. P2 speichert daher dieselbe kanonische Eingabe und führt keine zweite Schlüsselrepräsentation als Wahrheit ein.

Auf Read muss ein frischer Bytewert geliefert werden; Aufrufer dürfen keinen intern gehaltenen mutierbaren Buffer erhalten.

## P2 Record

Ein historischer P2-Record enthält exakt:

- `key_id`: `key:sha256:<64 lowercase hex>`,
- `algorithm = "Ed25519"`,
- `public_key_bytes`: exakt 32 Bytes.

Keine Actor-ID, keine Welt-ID und keine Trust-Aussage gehören in diesen Record. Actor↔Key-Vertrauen bleibt ein separater Vertrag.

## key_id-Verifikation

Ein Write darf nur akzeptiert werden, wenn:

1. `public_key_bytes` exakt 32 Bytes lang sind;
2. der Algorithmus exakt `Ed25519` ist;
3. aus den Bytes mit der bereits eingefrorenen I12-v1-Ableitung
   `provoware:i12:key-id:v1\n + rawPublicKeyBytes`
   exakt der übergebene `key_id` entsteht.

Der spätere Infrastructure-Adapter darf dafür keine zweite Ableitungslogik erfinden. Er erhält eine injizierte, bereits vertragsgebundene `deriveKeyId(publicKeyBytes)`-Capability oder eine äquivalente bestehende I12-Capability.

Mismatch zwischen Bytes und `key_id` ist **fail-closed** und erzeugt keinen Write.

## Ownership und Store-Grenze

P2 bleibt im separaten I12-Persistenzbereich:

- DB: `provoware-bunkersignale-i12`
- P1 Store: `signing_keys` — unverändert
- geplanter P2 Store: `public_keys`
- geplanter KeyPath: `key_id`

Infrastructure besitzt nur Persistenzmechanik und Record-Validierung.

Application entscheidet, wann ein Public Key historisch registriert werden muss. Domain, I06 und I08 bleiben frei von IndexedDB-/`CryptoKey`-Abhängigkeiten.

Eine spätere additive DB-Versionserhöhung darf ausschließlich den neuen `public_keys`-Store anlegen. Sie darf P1-Daten weder transformieren noch löschen noch überschreiben. Diese Migration ist **nicht Teil dieses Contract Gates**.

## Minimale API P2

Die spätere P2-API exponiert ausschließlich:

- `putIfAbsent(record)`
- `readById(keyId)`

### putIfAbsent(record)

Verhalten:

- unbekannter `key_id` + gültige Bytes → einmalig persistieren;
- bekannter `key_id` + byteidentische Bytes → **idempotenter Erfolg / keine Mutation**;
- bekannter `key_id` + abweichende Bytes → **Konflikt / fail-closed / keine Mutation**;
- ungültiger Record oder `key_id`-Mismatch → fail-closed / keine Mutation.

Kein `replace`, `update`, `upsert`, `delete`, `rotate` oder `clear`.

### readById(keyId)

Verhalten:

- bekannter `key_id` → kanonischer P2-Record mit frischer Kopie der 32 Bytes;
- unbekannter `key_id` → `null`;
- strukturell korrupter gespeicherter Record → stabiler Storage-/Record-Fehler, niemals still `null`;
- keine automatische Reparatur und kein Lookup aus Netzwerk/Backup/P1.

## Immutability / No-Clobber

Historische Public Keys sind append-only.

Für denselben `key_id` darf ein bereits vorhandener Record niemals durch anderes Material ersetzt werden.

Prüfung und möglicher Insert müssen später in derselben `readwrite`-Transaktion stattfinden. Ein Read-before-Write außerhalb dieser Transaktion ist als No-Clobber-Garantie unzulässig.

Ein byteidentischer Duplicate darf als idempotenter No-op behandelt werden, damit wiederholte Registrierung desselben bereits verifizierten Public Keys keinen künstlichen Fehler erzeugt.

## Konfliktverhalten

Stabile Fehlerklassen müssen mindestens unterscheiden:

- ungültiger P2-Record,
- `key_id` passt nicht zu `public_key_bytes`,
- bestehender `key_id` hat widersprüchliche Bytes,
- Open-/Read-/Write-/Transaction-Fehler,
- korrupter gespeicherter Record.

Rohe DOMExceptions dürfen nicht bis UI/Application durchgereicht werden.

Ein Konflikt darf weder P1-Key noch historischen P2-Record verändern.

## Grenze zu P1

P1 speichert den **aktiven** privaten + öffentlichen `CryptoKey`.

P2 speichert die **historische öffentliche Byte-Wahrheit** pro `key_id`.

P2 darf nicht voraussetzen, dass der P1-Record dauerhaft vorhanden bleibt. Beim späteren Lifecycle muss ein Public Key vor oder gleichzeitig mit seiner Verwendung als historisch relevant in P2 registriert werden; die genaue Orchestrierung gehört in die Implementierungsplanung nach diesem Contract Gate.

P2 besitzt keine Schreibberechtigung auf `signing_keys`.

## Grenze zu P3

P3 bleibt vollständig gesperrt.

Vor einem späteren Signature-Write muss dessen `key_id` durch P2 auflösbar sein. P2 implementiert jedoch noch keinen Signature-Store und kennt keine Event-/World-Signature-Indizes.

## Geplante Contract-Tests vor P2-Freeze

Die spätere Implementierung muss mindestens folgende Contract-Fälle binden:

1. gültige 32-Byte-Ed25519-Public-Key-Bytes + korrekter `key_id` werden gespeichert;
2. `readById` liefert byteidentische, aber nicht aliasierte Bytes;
3. unbekannter `key_id` liefert `null`;
4. falsche Byte-Länge wird fail-closed abgelehnt;
5. nicht-kanonischer/falscher `key_id` wird abgelehnt;
6. gleicher `key_id` + gleiche Bytes ist idempotent;
7. gleicher `key_id` + andere Bytes ist Konflikt/no-clobber;
8. korrupter gespeicherter Record ist fail-closed;
9. injizierter Transaction-/Clone-/Queue-Fehler behauptet keinen erfolgreichen Write;
10. P1-`signing_keys` bleibt bei P2-Upgrade und P2-Schreibvorgängen unverändert;
11. API-Oberfläche enthält weder Delete/Replace/Rotate noch P3-Funktionen.

## Non-Goals

- kein IndexedDB-Produktcode in diesem Gate;
- keine DB-Versionserhöhung/Migration in diesem Gate;
- keine Änderung am P1-Store;
- keine detached Signature Persistence;
- keine Rotation;
- kein Actor↔Key-Trust-Store;
- keine Private-Key-Recovery;
- keine Backup-/Restore-Erweiterung;
- kein Authenticity Export;
- keine Trusted-Checkpoint-Persistence;
- keine Netzwerk-Key-Discovery;
- keine I13-/I14-Funktion;
- keine UI- oder Produktlogikänderung.

## Exit-Gates dieses Contract Gates

1. Repräsentation ist auf exakt 32 rohe Ed25519-Bytes eingefroren.
2. `key_id` muss vor jedem Write aus denselben Bytes reproduziert und exakt bestätigt werden.
3. Store-/Ownership-Grenzen zwischen P1, P2, I08 und I10 sind eindeutig.
4. `putIfAbsent` + `readById` sind die einzige freigegebene minimale P2-API.
5. Identische Duplicates sind idempotent; widersprüchliche Bytes für denselben `key_id` sind fail-closed.
6. Geplante Contract-Tests decken Validierung, Immutability, Korruption und P1-Isolation ab.
7. P3 bleibt ausdrücklich gesperrt.
8. Kein Produkt-, DB-, Schema-, UI- oder Testcode wird in diesem Contract Gate implementiert.
9. I08/I10 bleiben geschlossen.
10. Repository Quality ist nach Evidence-Neubindung grün.
11. Finaler Diff enthält ausschließlich P2-Vertrag/Masterplanung, Change Record und I12-Evidence/Status.

## Restrisiko

Die konkrete additive IndexedDB-Version für `public_keys`, stabile P2-Fehlercodes und die exakte Bootstrap-Verdrahtung werden erst im nächsten Implementierungsblock gebunden. Dieses Gate erlaubt noch keinen P2-Code.

## Nächster Schritt

Nach grünem Freeze dieses Contract Gates darf ausschließlich der **kleinste P2-Implementierungsblock** geplant werden: additive I12-DB-Erweiterung für `public_keys`, `putIfAbsent` + `readById` und die oben eingefrorenen Contract-Tests.

P3 bleibt bis zum vollständig grünen P2-Implementierungs-Freeze gesperrt.
