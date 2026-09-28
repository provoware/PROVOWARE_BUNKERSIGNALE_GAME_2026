# I12-C – P3 Detached Signature Persistence Contract

## Zweck

Dieser Contract Gate friert ausschließlich die spätere lokale Persistenz bereits erfolgreich verifizierter detached Signature Records ein. Er autorisiert noch keine Implementierung.

P3 speichert abgeleitete Authentizitätsnachweise. Der I08-Eventstrom bleibt die einzige fachliche Event-Wahrheit und wird weder erweitert noch mutiert.

## Voraussetzungen

P3 akzeptiert ausschließlich echte Evidence aus dem grünen P2-LV-Pfad:

`verifyLocalSignatureEvidence(record, context, capabilities)`

Ein freier Signature Record, ein Boolean wie `verified: true` oder ein kopiertes/serialisiertes Evidence-Objekt darf keinen Write auslösen. Der spätere Application-Pfad MUSS den Record ausschließlich über `readVerifiedLocalSignatureRecord(evidence)` beziehen.

Da P2 Public Keys weder löscht noch überschreibt und P2-LV den historischen Key vor Ausstellung der Evidence erfolgreich gelesen hat, ist keine Cross-Store-Write-Transaktion mit P2 erforderlich.

## Ownership und Storage-Grenze

Infrastructure besitzt ausschließlich IndexedDB-Mechanik. Application besitzt die P2-LV-Evidence-Barriere.

Geplanter Infrastructure-Owner:

`app/infrastructure/browser/indexeddb-signature-store.js`

Geplanter Application-Owner:

`app/application/verified-signature-persistence.js`

Eigene bestehende I12-Datenbank:

`provoware-bunkersignale-i12`

Neuer P3-Store:

`signature_records`

P3 darf keine I08-/I09-/I10-Datenbank öffnen oder migrieren.

## Persistierter Record und Primärschlüssel

Persistiert wird exakt der von P2-LV zurückgegebene eingefrorene Signature-Record-v1-Snapshot mit den Feldern:

- `format`
- `format_version`
- `world_id`
- `event_id`
- `author_id`
- `key_id`
- `algorithm`
- `signature`

Es werden keine Felder wie `verified`, `trusted`, `created_at` oder Proof-Metadaten ergänzt.

Der IndexedDB-Primärschlüssel ist der zusammengesetzte Schlüssel:

`[world_id, event_id, key_id]`

Damit können nach einer späteren expliziten Rotation mehrere historische Signaturen für dasselbe Event koexistieren. P3 implementiert selbst keine Rotation.

## Minimale APIs

### Infrastructure

`createIndexedDbSignatureStore({ indexedDB, dbName? })`

liefert ausschließlich:

- `putIfAbsent(record)`
- `readByEvent(worldId, eventId)`

`putIfAbsent(record)` validiert die exakte Signature-Record-v1-Form und schreibt no-clobber.

`readByEvent(worldId, eventId)` liefert immer ein Array frischer, eingefrorener Record-Kopien, deterministisch aufsteigend nach `key_id` sortiert. Kein Treffer liefert `[]`.

### Application

`persistVerifiedLocalSignature(evidence, { signatureStore })`

Die Capability-Oberfläche ist exakt. Die Funktion liest den gebundenen Record über den modulimportierten `readVerifiedLocalSignatureRecord(...)` und übergibt ausschließlich diesen Snapshot an `signatureStore.putIfAbsent(record)`.

Der Application-Pfad liefert nach Erfolg den unveränderten eingefrorenen Record-Snapshot zurück. Er akzeptiert keinen frei injizierten Evidence-Reader und keine P1-, P2-, Signing-, Netzwerk- oder Backup-Capability.

## No-clobber und Idempotenz

Für `[world_id, event_id, key_id]` gilt:

- ein byte-/feldidentischer vorhandener Record ist ein idempotenter Erfolg;
- ein abweichender Record ist ein Konflikt und schlägt fail-closed fehl;
- Prüfung und erstmaliges `add` erfolgen in derselben `readwrite`-Transaktion;
- kein `put`, `upsert`, `replace`, `delete` oder `clear` wird exponiert.

Queue-, Clone-, Request- und Transaction-Fehler dürfen keinen erfolgreichen Write behaupten.

## Datenbankmigration

Die spätere Implementierung darf die bestehende I12-Datenbank ausschließlich um `signature_records` erweitern und muss P1 `signing_keys` sowie P2 `public_keys` unverändert erhalten.

Die konkrete neue DB-Version wird erst im Implementierungsblock gemeinsam in allen I12-Adaptern geändert. Ein Öffnen über jeden Adapter MUSS danach alle drei Stores idempotent sicherstellen. Es gibt keine Datenmigration oder Umschreibung bestehender Records.

## Fehleroberfläche

Infrastructure verwendet exakt folgende stabile Codes:

- `I12_SIGNATURE_RECORD_INVALID`
- `I12_SIGNATURE_CONFLICT`
- `I12_SIGNATURE_STORAGE_OPEN_FAILED`
- `I12_SIGNATURE_STORAGE_READ_FAILED`
- `I12_SIGNATURE_STORAGE_WRITE_FAILED`

Application ergänzt exakt:

- `I12_VERIFIED_SIGNATURE_EVIDENCE_INVALID`
- `I12_VERIFIED_SIGNATURE_CAPABILITY_INVALID`
- `I12_VERIFIED_SIGNATURE_PERSIST_FAILED`

Ungültige oder gefälschte Evidence wird als `...EVIDENCE_INVALID` abgewiesen, bevor der Store aufgerufen wird. Eine falsche Capability-Oberfläche ergibt `...CAPABILITY_INVALID`. Infrastructure-Fehler werden als Ursache von `...PERSIST_FAILED` gebunden; Browser-/DOMExceptions gelangen nicht ungefiltert an Aufrufer.

Fehlermeldungen enthalten weder Signaturbytes noch Schlüsselmaterial oder vollständige Records.

## Verbindliche Tests der späteren Implementierung

1. echte P2-LV-Evidence persistiert exakt ihren gebundenen Record;
2. freies, kopiertes, geklontes oder JSON-deserialisiertes Evidence löst keinen Store-Aufruf aus;
3. Application-Capability-Surface ist exakt und verbietet zusätzliche Persistence-/Key-Capabilities;
4. identischer Duplicate ist idempotent;
5. abweichender Record für denselben Primärschlüssel schlägt no-clobber fehl;
6. zwei unterschiedliche `key_id` für dasselbe Event koexistieren;
7. `readByEvent` liefert `[]` bei keinem Treffer und sonst frische eingefrorene Kopien in deterministischer Reihenfolge;
8. ungültige Input- und gespeicherte Records schlagen fail-closed fehl;
9. Open-, Read-, Queue-, Clone-, Write- und Transaction-Fehler werden stabil übersetzt;
10. injizierter Write-Fehler hinterlässt keinen Teilrecord;
11. Upgrade erhält vorhandene P1- und P2-Records byte-/wertgleich;
12. weder I08/I10 noch Backup/Restore werden geöffnet oder verändert.

## Non-Goals

- keine Implementierung in diesem Gate;
- keine Rotation oder Actor↔Key-Trust-Persistenz;
- kein Authenticity Export und kein Private-Key-Backup;
- keine Trusted-Checkpoint-Persistenz;
- kein Delete, Replace, Upsert oder Repair;
- keine Netzwerk- oder Server-Synchronisation;
- kein Multi-Tab-Writer-Protokoll;
- kein I08-/I10-REOPEN;
- keine UI- oder Visual-World-Änderung.

## Exit-Gates

1. ausschließlich echte P2-LV-Evidence autorisiert den Application-Write;
2. Record-v1 und zusammengesetzter Primärschlüssel sind exakt eingefroren;
3. No-clobber-, Idempotenz- und Read-Reihenfolge sind eindeutig;
4. stabile Infrastructure- und Application-Fehleroberflächen sind vollständig;
5. Migration bleibt auf den neuen I12-Store begrenzt und erhält P1/P2;
6. Implementierungstests einschließlich Fehler- und Upgradepfaden sind vollständig geplant;
7. I08/I10, Rotation, Export, Recovery und Multi-Tab bleiben geschlossen;
8. Repository Quality ist grün.

## Nächster Schritt

Nach grünem Contract-Freeze ausschließlich den kleinsten P3-Infrastructure-Store und den Evidence-verbrauchenden Application-Pfad samt direkten Contract-Tests implementieren.
