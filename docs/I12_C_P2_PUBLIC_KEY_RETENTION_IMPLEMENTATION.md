# I12-C – P2 Historical Public-Key Retention Implementation

## Zweck

Dieser Block implementiert ausschließlich den eingefrorenen P2-Vertrag für historische öffentliche Ed25519-Schlüssel.

## Implementierung

- additive I12-DB-Version: **2**
- bestehender P1-Store: `signing_keys` bleibt semantisch unverändert
- neuer P2-Store: `public_keys`, KeyPath `key_id`
- neue Infrastructure-Datei: `indexeddb-public-key-store.js`
- einzige P2-Methoden: `putIfAbsent(record)` und `readById(keyId)`

P1 wird nur auf DB-Version 2 angehoben und legt bei einer neuen Datenbank beide I12-Stores an. Seine API, Record-Invarianten und No-Clobber-Semantik bleiben unverändert. Dieser minimale Integrationspatch verhindert, dass P1 nach einem P2-Upgrade mit `VersionError` scheitert.

## Sicherheitsinvarianten

- P2 akzeptiert ausschließlich 32 rohe Ed25519-Public-Key-Bytes.
- `key_id` wird vor jedem Write über die injizierte, bereits eingefrorene I12-`deriveKeyId`-Capability bestätigt.
- gleicher `key_id` + identische Bytes ist idempotent;
- gleicher `key_id` + andere Bytes ist fail-closed Konflikt;
- bestehende historische Keys werden niemals ersetzt;
- Readback liefert eine neue Byte-Kopie;
- korrupte Records werden nicht als `null` verschluckt;
- P2 schreibt niemals in `signing_keys`.

## Contract-Tests

Der reale Chromium-Smoke bindet:

1. gültige 32-Byte-Repräsentation;
2. nicht aliasierten Readback;
3. unbekannten Key → `null`;
4. falsche Länge;
5. falsche `key_id`;
6. idempotenten Duplicate;
7. Konflikt/no-clobber über injizierte Collision-Capability;
8. korrupten gespeicherten Record;
9. injizierten Storage-Open-Fehler als fail-closed Infrastrukturfehler;
10. Upgrade einer bestehenden v1-Datenbank auf v2 ohne Mutation des P1-`signing_keys`-Records;
11. API exakt `putIfAbsent` + `readById`.

Der bestehende P1-Chromium-Smoke bleibt aktiv und wurde ausschließlich auf das neue I12-DB-Schema v2 angepasst.

## Nicht-Ziele

Keine detached Signature Persistence, Rotation, Backup-/Restore-Erweiterung, Trusted-Checkpoint-Persistence, Actor-Trust-Persistence, I08-/I10-Änderung oder UI-Änderung.

## Ergebnis / Freeze

Merge ausschließlich bei grünen P2-, P1-, I12-Crypto-, allgemeinen Browser- und Repository-Quality-Gates sowie sauberem finalen Scope-Diff.

## Restrisiko

P2 besitzt noch keine Orchestrierung, die vor einem späteren Signature-Write automatisch sicherstellt, dass der zugehörige Public Key registriert wurde. Diese Lifecycle-Orchestrierung darf nicht gemeinsam mit P3 vorgezogen werden.

## Nächster Schritt

Nach grünem P2-Freeze zuerst den nächsten I12-C-Masterplanpunkt gegen die eingefrorene Sequenz auflösen. P3 bleibt bis dahin gesperrt.
