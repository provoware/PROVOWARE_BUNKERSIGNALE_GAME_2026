# I12-C – P2 Sequence Decision

## Zweck

Dieser Decision Gate löst ausschließlich die nach P1 noch offene Reihenfolge innerhalb I12-C auf. Es wird **keine weitere Persistence implementiert**.

## Befund

Die bisherige Masterplanung fordert getrennt:

- historische Public-Key-Retention,
- detached Signature Persistence,
- explizite Rotation,
- Lost-Key-Verhalten,
- unveränderte I08-/I10-Verträge.

Sie benannte nach P1 jedoch keine verbindliche Reihenfolge zwischen Public-Key-Retention und Signature Persistence.

## Entscheidung

**P2 ist Historical Public-Key Retention.**

Detached Signature Persistence folgt erst danach als **P3**.

### Begründung

Der bereits verbindliche I12-Lifecycle verlangt:

- alte Signaturen bleiben nach Lost-Key unverändert prüfbar;
- spätere Rotation darf alte Public Keys nicht überschreiben;
- jeder detached Signature Record referenziert einen `key_id`.

Damit ist ein dauerhaft auflösbarer historischer Public Key die infrastrukturelle Voraussetzung für dauerhaft sinnvoll verifizierbare Signature Records. Würden Signaturen zuerst persistent gemacht, könnte das Repository persistente Authentizitätsnachweise erzeugen, deren referenzierter Public Key nach einem späteren Lifecycle-Wechsel nicht mehr verfügbar ist.

P2 wird deshalb vor P3 eingefroren.

## P2-Ziel

Der **nächste** freigegebene Entwicklungsblock ist zunächst nur ein Contract Gate für historische Public-Key-Retention. Er muss vor Produktcode festlegen:

- Ownership und Store-Grenze innerhalb des separaten I12-Bereichs;
- kanonische Repräsentation des historischen Public Keys;
- Ableitung/Prüfung gegen den bereits eingefrorenen `key_id`;
- immutable/no-clobber-Verhalten bei bekanntem `key_id`;
- Verhalten bei widersprüchlichem Key-Material;
- minimale Read-API für historische Verifikation;
- Lifecycle-Grenze zwischen aktivem P1-Key und historischen Public Keys.

## Non-Goals

Dieser Sequence Gate enthält ausdrücklich:

- keinen neuen IndexedDB-Store;
- keine DB-Versionserhöhung oder Migration;
- keinen Public-Key-Persistence-Code;
- keinen detached Signature Store;
- keine Rotation;
- keinen Private-Key-Import/Export;
- keine Backup-/Restore-Erweiterung;
- keine Trusted-Checkpoint-Persistence;
- keine UI-/Produktlogikänderung;
- kein I08-/I10-REOPEN;
- keine I13-/I14-Funktion.

## Freeze-Grenzen

Byteunverändert bleiben müssen insbesondere:

- `app/infrastructure/browser/indexeddb-signing-key-store.js` aus P1;
- I06-/I08-/I09-/I10-/I11-Produkt- und Schema-Verträge;
- I12-A Signature-/Checkpoint-Verträge;
- I12-B Ed25519-Crypto-Adapter;
- bestehende Browser-Smokes, sofern kein unmittelbarer Governance-Blocker vorliegt.

## Exit-Gates dieses Sequence Gates

1. Die normative I12-Masterplanung benennt P2 vor P3 eindeutig.
2. P2-Ziel, Non-Goals und Freeze-Grenzen sind dokumentiert.
3. Kein Produkt-, Schema-, Persistence-, UI- oder Testcode wird verändert.
4. I08 und I10 bleiben geschlossen.
5. Repository Quality ist nach Evidence-Neubindung grün.
6. Finaler Diff enthält ausschließlich Masterplan/Decision-Dokumentation, Change Record sowie I12-Evidence/Status.

## Restrisiko

Die Reihenfolge ist jetzt entschieden; die konkrete P2-Repräsentation und API sind noch absichtlich offen. Insbesondere wird in diesem Gate nicht vorweggenommen, ob der historische Public Key als rohe kanonische Ed25519-Bytes oder in einer anderen browserlokalen Repräsentation gespeichert wird. Diese Entscheidung gehört in den nächsten P2-Contract-Block.

## Nächster Schritt

Nach grünem Freeze dieses Decision Gates ausschließlich **P2 Contract Gate – Historical Public-Key Retention** eröffnen. Erst dort Repräsentation, Store-API, No-Clobber-Invarianten und Contract-Tests festlegen. Noch keine P2-Implementierung.
