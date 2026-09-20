# I12-C – Persistence Adapter Contract

## Zweck

Dieser Block löst ausschließlich den kleinsten produktiven I12-Persistenzadapter vor seiner Implementierung auf. Der grüne Chromium-Proof hat gezeigt, dass ein nicht extrahierbarer Ed25519-`CryptoKey` nach IndexedDB-Close/Reopen weiter nutzbar ist. Daraus folgt noch kein freier Implementierungsauftrag: Store-Grenze, Ownership, Transaktionen und Fehlerverhalten werden zuerst eingefroren.

## REOPEN

**I12 bleibt explizit für I12-C geöffnet.** Dieser Vertrag konkretisiert den bereits freigegebenen I12-C-Persistenzpfad.

**Kein I08-/I10-REOPEN.** Der autoritative Event-Store und World Backup/Restore v1 bleiben unverändert. Der I12-Adapter bekommt einen eigenen Datenbanknamen und darf keine I08-/I10-Stores öffnen oder migrieren.

## Kleinster produktiver Adapter – P1

P1 persistiert ausschließlich **einen aktiven lokalen Signaturschlüssel**:

- `key_id`,
- nicht extrahierbarer privater Ed25519-`CryptoKey`,
- zugehöriger öffentlicher Ed25519-`CryptoKey`.

Noch **keine detached Signature Records**, keine historische Key-Retention und keine Rotation. Diese Verantwortungen bleiben nach P1 gesperrt.

## Ownership

Infrastructure besitzt ausschließlich IndexedDB-Mechanik. Application entscheidet, wann ein Schlüssel erzeugt oder zum Signieren verwendet werden darf. Domain, I06-Event-Envelopes und I08 bleiben frei von `CryptoKey`-/IndexedDB-Abhängigkeiten.

Geplanter Owner:

`app/infrastructure/browser/indexeddb-signing-key-store.js`

Eigene DB:

`provoware-bunkersignale-i12`

P1-Store:

`signing_keys`

## API-Vertrag P1

Der Adapter exponiert nur:

- `putIfAbsent(record)` – legt den ersten aktiven Schlüssel no-clobber ab,
- `readActive()` – liefert den gespeicherten Record oder `null`.

Kein `delete`, kein `replace`, kein `upsert`, kein `rotate`, kein Import privater Schlüssel.

## Record-Invarianten

Ein P1-Record enthält exakt:

- `slot = "active"`,
- `key_id` im bereits eingefrorenen I12-Format `key:sha256:<64 lowercase hex>`,
- `private_key`: `CryptoKey`, Typ `private`, Algorithmus `Ed25519`, `extractable === false`, Usage enthält `sign`,
- `public_key`: `CryptoKey`, Typ `public`, Algorithmus `Ed25519`, Usage enthält `verify`.

Der Adapter berechnet **keinen** `key_id`. Die bereits eingefrorene I12-Application-/Crypto-Schicht bleibt dafür verantwortlich.

## Transaktionsgrenze und No-clobber

`putIfAbsent` prüft und schreibt in **derselben** `readwrite`-Transaktion. Existiert Slot `active`, wird ohne Mutation mit stabilem Fehler abgebrochen. Ein Check außerhalb der Write-Transaktion ist verboten.

Clone-/Queue-/Transaction-Fehler führen fail-closed zu keiner erfolgreichen Ablagebehauptung. Der Adapter erzeugt niemals automatisch einen Ersatzschlüssel.

## Lost-Key-Verhalten

`readActive() === null` bedeutet ausschließlich: kein aktiver Schlüssel vorhanden. Application darf daraus **keine automatische Regeneration** ableiten.

Ist ein gespeicherter Record strukturell oder kryptografisch unbrauchbar, muss P1 fail-closed mit stabilem Storage-Fehler reagieren; der beschädigte Record wird weder überschrieben noch automatisch repariert.

## Fehleroberfläche

Browser-/DOMExceptions dürfen nicht bis zur UI durchgereicht werden. P1 verwendet stabile I12-Storage-Fehlercodes für:

- vorhandenen aktiven Schlüssel / no-clobber,
- ungültigen Record,
- Open-/Read-/Write-/Transaction-Fehler.

Die konkrete minimale Code-Liste wird mit der Implementierung durch Contract-Tests gebunden.

## Security

- kein Private-Key-Export,
- kein Logging von `CryptoKey` oder Schlüsselmaterial,
- kein JSON-Serialisieren des privaten Schlüssels,
- keine Backup-/Restore-Integration,
- keine stille Regeneration,
- keine Änderung an I08/I10.

## Exit-Gates vor P1-Implementierung

1. Repository Quality bleibt grün.
2. Finaler Diff dieses Blocks enthält ausschließlich Vertrag/Dokumentation, Change Record und genau eine isolierte CSS-UX-Änderung.
3. I08/I10-Produkt- und Schema-Dateien bleiben byteunverändert.
4. Keine produktive Persistence-Implementierung wird in diesem Contract-Block vorgezogen.

## Restrisiko

P1 löst nur den aktiven lokalen Schlüssel. Historische Public Keys und detached Signature Records sind für dauerhafte historische Authentizität weiterhin notwendig, werden aber bewusst in getrennten Folgeblöcken behandelt. Multi-Tab-Writer-Koordination bleibt I14 und darf nicht vorgezogen werden.

## Nächster Schritt

Erst nach grünem Merge dieses Vertrags den kleinsten P1-Adapter mit Contract-Tests implementieren: eigener I12-Store, `putIfAbsent` + `readActive`, atomarer no-clobber-Pfad und fail-closed Fehlerübersetzung. Noch keine Signatur-Persistenz, Rotation oder Backup-Erweiterung.
