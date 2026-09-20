# I12-C – P2-L Active Key Registration Barrier Contract

## Zweck

Dieser Contract Gate friert ausschließlich die Application-Orchestrierung zwischen dem grün eingefrorenen P1 Active Signing-Key Store und P2 Historical Public-Key Store ein. Noch kein Application-Code.

P3 Detached Signature Persistence bleibt gesperrt.

## Öffentliche Funktionssignatur

Die spätere minimale Application-Funktion lautet:

`ensureActiveSigningKeyRegistered({ signingKeyStore, publicKeyStore, exportPublicKey, deriveKeyId })`

Sie besitzt keine impliziten Globals, keine direkte IndexedDB-Nutzung und keine UI-Abhängigkeit.

## Capability-Injection

Pflicht-Capabilities:

- `signingKeyStore.readActive()`
- `exportPublicKey(publicCryptoKey)`
- `deriveKeyId(publicKeyBytes)`
- `publicKeyStore.putIfAbsent(record)`

Die Funktion erzeugt keine Schlüssel, signiert nichts und persistiert keine Signaturen.

## Reihenfolge / Call-Barrier

Verbindlich:

1. `readActive()`
2. aktiven Public-`CryptoKey` als raw32 exportieren
3. `deriveKeyId(raw32)`
4. abgeleiteten `key_id` exakt gegen P1-`key_id` prüfen
5. P2-`putIfAbsent({ key_id, algorithm:"Ed25519", public_key_bytes })`
6. Erfolg zurückgeben

**Vor erfolgreichem Schritt 5 darf keine Sign-Capability aufgerufen werden.**

Die spätere Sign-Orchestrierung MUSS zuerst diese Funktion erfolgreich abschließen und ausschließlich deren bestätigten `key_id` weiterverwenden.

## Rückgabewert

Erfolg liefert ein unveränderliches Objekt:

`{ key_id, public_key_bytes }`

- `key_id`: bestätigter P1/P2-`key_id`
- `public_key_bytes`: frische 32-Byte-Kopie
- Objekt und Bytequelle dürfen keine mutierbare Store-Referenz durchreichen.

## Stabile Application-Fehlercodes

- `I12_ACTIVE_KEY_MISSING`
- `I12_ACTIVE_KEY_EXPORT_FAILED`
- `I12_ACTIVE_KEY_ID_DERIVE_FAILED`
- `I12_ACTIVE_KEY_ID_MISMATCH`
- `I12_ACTIVE_KEY_REGISTRATION_FAILED`

Rohe DOM-/IndexedDB-/Crypto-Fehler dürfen nicht bis UI/Domain durchgereicht werden.

## Fehlerabbildung

- P1 liefert `null` → `I12_ACTIVE_KEY_MISSING`
- Export wirft/ungültige raw32 → `I12_ACTIVE_KEY_EXPORT_FAILED`
- derive wirft/ungültiger Rückgabewert → `I12_ACTIVE_KEY_ID_DERIVE_FAILED`
- derived ID != P1 ID → `I12_ACTIVE_KEY_ID_MISMATCH`
- P2 Konflikt/Storagefehler → `I12_ACTIVE_KEY_REGISTRATION_FAILED`

Jeder Fehler beendet die Barriere ohne Signaturaufruf.

## Idempotenter Existing-Key-Pfad

P2-`putIfAbsent` bleibt maßgeblich:
- gleicher `key_id` + gleiche Bytes → Erfolg,
- Konflikt → fail-closed.

Die Application darf keinen vorgelagerten `readById`-Check als Ersatz für P2-No-Clobber erfinden.

## Contract-Tests

Die spätere Implementierung muss mindestens binden:

1. kein aktiver P1-Key → MISSING;
2. gültiger P1-Key → raw32 → derive → P2 register → Erfolg;
3. Exportfehler → EXPORT_FAILED;
4. falsche Byte-Länge nach Export → EXPORT_FAILED;
5. derive-Fehler → ID_DERIVE_FAILED;
6. derive liefert malformed ID → ID_DERIVE_FAILED;
7. derived ID != P1-ID → ID_MISMATCH und P2 wird nicht aufgerufen;
8. identisch bereits registrierter P2-Key → Erfolg;
9. P2 Konflikt/Storagefehler → REGISTRATION_FAILED;
10. Rückgabe ist nicht aliasiert;
11. Call-Trace beweist exakt `read → export → derive → register`;
12. eine injizierte Sign-Capability wird in allen Fehlerfällen **0-mal** und erst nach erfolgreicher Barriere aufgerufen;
13. P1/P2 APIs bleiben unverändert.

## Non-Goals

Kein Application-Code in diesem Gate, keine neue Persistence, keine DB-/Schemaänderung, keine Rotation, keine P3-Signature-Persistence, keine Backup-/Restore-Erweiterung, keine UI-Änderung und kein I08-/I10-REOPEN.

## Exit-Gates

1. Signatur, Capabilities und Rückgabewert eindeutig eingefroren.
2. stabile Fehlercodes vollständig.
3. Reihenfolge und harte Sign-Barrier dokumentiert.
4. idempotenter Existing-Key-Pfad nutzt ausschließlich P2-`putIfAbsent`.
5. Contract-Tests inklusive Call-Trace und „sign never before P2 success“ festgelegt.
6. P1/P2/DB/UI/Testcode unverändert.
7. P3 ausdrücklich gesperrt.
8. Repository Quality nach Evidence-Bindung grün.
9. finaler Diff ausschließlich Contract/Governance/Agenten-/Planungs-/Evidence-Dateien.

## Nächster Schritt

Nach grünem Freeze ausschließlich den kleinsten P2-L-Application-Implementierungsblock eröffnen. P3 bleibt bis zum grünen P2-L-Implementierungs-Freeze gesperrt.
