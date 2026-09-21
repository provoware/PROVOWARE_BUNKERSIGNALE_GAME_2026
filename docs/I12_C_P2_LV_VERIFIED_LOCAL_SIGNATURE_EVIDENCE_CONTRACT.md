# I12-C – P2-LV Verified Local Signature Evidence Contract

## Zweck

Dieser Contract Gate friert ausschließlich die Application-Grenze ein, die einen lokal erzeugten detached Signature Record **vor jeder späteren P3-Persistenz** gegen die historische P2-Public-Key-Wahrheit verifiziert.

Noch keine Implementierung und kein Signature Store.

## Öffentliche API

Die spätere minimale Application-API besteht aus genau zwei Funktionen:

`verifyLocalSignatureEvidence(record, context, capabilities)`

`readVerifiedLocalSignatureRecord(evidence)`

Die erste Funktion verifiziert und stellt einen opaken Proof aus. Die zweite gibt ausschließlich für einen vom selben Modul ausgestellten gültigen Proof den unveränderten, intern eingefrorenen Signature Record zurück.

## Eingaben

### record

`record` ist der detached Signature Record aus dem grünen P2-LI Registered-Sign-Pfad.

Er wird nicht um Felder erweitert. Insbesondere gibt es kein `verified`, `trusted`, `persistable` oder vergleichbares Boolean-Feld.

### context

Der Context besitzt exakt:

- `worldId`
- `event`
- `chainEntry`
- `i11Verified`

Zusätzliche Felder sind fail-closed unzulässig.

## Capability-Injection

`capabilities` besitzt exakt:

- `publicKeyStore` mit `readById(keyId)`
- `importPublicKey(publicKeyBytes)`
- `verifySignature(bytes, signature, publicKey)`
- `canonicalEventBytes(event)`
- `sha256Hex(bytes)`

Nicht erlaubt sind:

- Signing-Capabilities,
- P1-/Private-Key-Capabilities,
- Signature-Store-/Persistence-Capabilities,
- Netzwerk-/Backup-Key-Lookups,
- ein frei übergebener Public Key.

## Verbindliche Sequenz

1. Context- und Capability-Surface fail-closed validieren.
2. Signature Record ausschließlich gegen `context.worldId` und `context.event` über die bestehende I12-A-Record-Validierung prüfen.
3. `publicKeyStore.readById(record.key_id)`.
4. `null` als unbekannten historischen Key fail-closed ablehnen.
5. Die aus P2 gelesenen 32 Raw-Bytes mit `importPublicKey(...)` importieren.
6. `verifyEventDetached(record, context, ...)` wiederverwenden.
7. Die dafür injizierte `verifyBytes`-Bridge MUSS den von I12-A übergebenen `keyId` exakt gegen `record.key_id` prüfen und danach ausschließlich `verifySignature(bytes, signature, importedPublicKey)` aufrufen.
8. Nur wenn `verifyEventDetached(...)` exakt `true` liefert, einen opaken Verified-Evidence-Proof ausstellen.
9. Kein Persistenzaufruf findet in P2-LV statt.

## Public-Key-Wahrheit

Die einzige zulässige historische Schlüsselquelle ist P2:

`publicKeyStore.readById(record.key_id)`

Nicht zulässig:

- P1 Public-`CryptoKey`,
- ein Public Key aus dem Aufrufer-Context,
- Netzwerk,
- Backup/Restore,
- ein aus dem Signature Record selbst abgeleiteter Trust Anchor.

## Nicht fälschbarer Proof

Ein freies Objekt wie

`{ verified: true, record }`

ist verboten.

Die Implementierung MUSS einen **prozesslokalen, nicht serialisierbaren Proof** verwenden, dessen Gültigkeit nur das P2-LV-Modul selbst feststellen kann, zum Beispiel über eine modulprivate `WeakSet`-/`WeakMap`-Issuance oder eine äquivalente nicht vom Aufrufer setzbare Marke.

Verbindliche Eigenschaften:

- nur erfolgreicher Verify stellt Evidence aus;
- Evidence ist eingefroren;
- Kopieren, Objekt-Spread, `structuredClone`, JSON-Roundtrip oder manuelles Nachbauen erzeugen **keinen** gültigen Proof;
- Evidence enthält kein privates Schlüsselmaterial;
- Evidence ist kein persistierbares Produktformat;
- `readVerifiedLocalSignatureRecord(evidence)` akzeptiert ausschließlich echt ausgestellte Evidence;
- zurückgegeben wird der unveränderte, eingefrorene Record-Snapshot, der verifiziert wurde.

## Record-Snapshot

Vor Ausstellung der Evidence wird der erfolgreich verifizierte detached Signature Record als exakte Feldkopie eingefroren.

Damit darf der spätere P3-Application-Pfad nicht einen anderen oder nachträglich veränderten Record persistieren.

Der Snapshot enthält exakt die bereits eingefrorenen Signature-Record-v1-Felder und keine Proof-Metadaten.

## Fehleroberfläche

P2-`PublicKeyStoreError` aus `readById` wird unverändert durchgereicht.

P2-LV ergänzt exakt folgende stabile Application-Codes:

- `I12_LOCAL_SIGNATURE_EVIDENCE_CONTEXT_INVALID`
- `I12_LOCAL_SIGNATURE_EVIDENCE_CAPABILITY_INVALID`
- `I12_LOCAL_SIGNATURE_KEY_NOT_FOUND`
- `I12_LOCAL_SIGNATURE_KEY_IMPORT_FAILED`
- `I12_LOCAL_SIGNATURE_VERIFICATION_FAILED`
- `I12_LOCAL_SIGNATURE_EVIDENCE_INVALID`

Semantik:

- ungültiger Context/Record-Surface → `...CONTEXT_INVALID`;
- falsche/fehlende/zusätzliche Capability → `...CAPABILITY_INVALID`;
- P2 liefert `null` → `...KEY_NOT_FOUND`;
- Public-Key-Import wirft oder liefert unbrauchbares Ergebnis → `...KEY_IMPORT_FAILED`;
- Record-/I11-/Crypto-Verifikation liefert nicht exakt `true` oder Verify-Capability schlägt fehl → `...VERIFICATION_FAILED`;
- nicht vom Modul ausgestellte oder kopierte Evidence bei `readVerifiedLocalSignatureRecord` → `...EVIDENCE_INVALID`.

Private Schlüssel oder Raw-Key-Material dürfen nicht in Fehlermeldungen, Logs oder Evidence serialisiert werden.

## Rückgabewert

`verifyLocalSignatureEvidence(...)` liefert ausschließlich das opake, eingefrorene Evidence-Objekt.

Es liefert **keinen Boolean** und keinen frei vertrauenswürdigen `verified`-Status.

`readVerifiedLocalSignatureRecord(evidence)` liefert den intern gebundenen eingefrorenen Signature-Record-Snapshot.

## Contract-Tests

Die spätere Implementierung MUSS mindestens binden:

1. gültiger P2-Key + gültiger Record + gültiger I11-Kontext → Evidence;
2. exakter Call-Trace: `record validate → P2 readById → import → verifyEventDetached → evidence issue`;
3. P2 `null` → KEY_NOT_FOUND, kein Import/Verify;
4. P2 Read-Fehler wird unverändert durchgereicht;
5. Importfehler → KEY_IMPORT_FAILED, kein erfolgreicher Proof;
6. falscher Public Key → VERIFICATION_FAILED;
7. manipulierte Signatur → VERIFICATION_FAILED;
8. falsche Welt/Event/Author/I11-Bindung → VERIFICATION_FAILED;
9. Verify-Capability wirft oder liefert nicht exakt `true` → VERIFICATION_FAILED;
10. frei übergebener/zusätzlicher Public Key oder Persistence-Capability → CAPABILITY_INVALID;
11. Evidence-Objekt ist eingefroren;
12. Spread-/Clone-/JSON-/manuell nachgebauter Proof wird von `readVerifiedLocalSignatureRecord` abgewiesen;
13. gültige Evidence liefert exakt den verifizierten eingefrorenen Record-Snapshot;
14. keinerlei Signature-Persistence-/IndexedDB-Schreibpfad im Modul.

## Non-Goals

- keine P2-LV-Implementierung in diesem Gate;
- kein P3 Signature Store;
- keine DB-Version oder Schemaänderung;
- keine Änderung an P1/P2/P2-L/P2-LI;
- keine Rotation;
- keine Actor↔Key-Trust-Persistence;
- kein Authenticity Export;
- keine Trusted-Checkpoint-Persistence;
- kein Backup-/Restore-REOPEN;
- keine UI-/Visual-World-Änderung;
- kein I08-/I10-REOPEN.

## Exit-Gates

1. öffentliche API exakt eingefroren;
2. Context und Capability-Surface exakt eingefroren;
3. P2 ist einzige Public-Key-Wahrheit;
4. bestehendes `verifyEventDetached` wird wiederverwendet;
5. kein fälschbarer Boolean-Proof;
6. Proof ist prozesslokal, nicht serialisierbar und an exakt den verifizierten Record-Snapshot gebunden;
7. stabile Fehleroberfläche vollständig;
8. Contract-Tests vollständig geplant;
9. keinerlei Persistence im P2-LV-Modul;
10. P3 bleibt bis zum grünen P2-LV-Implementierungs-Freeze gesperrt;
11. I08/I10 bleiben geschlossen;
12. Repository Quality grün.

## Nächster Schritt

Nach grünem Freeze ausschließlich den kleinsten **P2-LV Application-Implementierungsblock** eröffnen.

P3 Detached Signature Persistence bleibt bis zum vollständig grünen P2-LV-Implementierungs-Freeze gesperrt.
