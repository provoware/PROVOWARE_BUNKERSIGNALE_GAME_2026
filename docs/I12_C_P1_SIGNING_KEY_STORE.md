# I12-C – P1 Signing Key Store

## Zweck

Dieser Block implementiert ausschließlich den im eingefrorenen I12-C-Vertrag freigegebenen P1-Adapter für genau einen aktiven lokalen Ed25519-Signaturschlüssel.

## Betroffene Bereiche

- `app/infrastructure/browser/indexeddb-signing-key-store.js`
- isolierter Chromium-Contract-Smoke für den Adapter
- eigener triggerbasierter Workflow
- genau eine visuelle UX-Änderung an der Erkennbarkeit des aktiven Tabs

I08, I10, Backup/Restore, Event-Store, Signatur-Persistenz und Rotation bleiben unverändert.

## Implementierung

Der Adapter besitzt ausschließlich `putIfAbsent(record)` und `readActive()`.

`putIfAbsent()` validiert den P1-Record und führt Existenzprüfung und Schreiben im selben `readwrite`-Transaction-Kontext aus. Ein bereits belegter Slot `active` wird mit stabilem Fehlercode abgelehnt und nicht überschrieben.

`readActive()` liefert bei leerem Store `null`. Ein vorhandener, aber strukturell oder kryptografisch ungültiger Record wird fail-closed abgelehnt. Browser-/DOM-Fehler werden in stabile I12-Storage-Fehler übersetzt.

Der Adapter erzeugt, rotiert, exportiert, repariert oder sichert keinen Schlüssel automatisch.

## Stabile Fehlercodes

- `I12_KEY_ALREADY_EXISTS`
- `I12_KEY_RECORD_INVALID`
- `I12_KEY_STORAGE_OPEN_FAILED`
- `I12_KEY_STORAGE_READ_FAILED`
- `I12_KEY_STORAGE_WRITE_FAILED`

## Prüfungen

Der P1-Browser-Smoke prüft:

1. leeren Store → `null`;
2. ungültigen Input → fail-closed;
3. non-extractable Ed25519-`CryptoKey` speichern und wieder lesen;
4. erneutes Signieren/Verifizieren mit dem persistenten Schlüssel;
5. Duplicate-Key → no-clobber;
6. beschädigten gespeicherten Record → fail-closed;
7. API-Oberfläche bleibt exakt `putIfAbsent` + `readActive`.

Zusätzlich laufen nur durch die geänderten Pfade ausgelöste bestehende Quality-/Browser-/UI-Gates.

## Visuelle UX

Genau eine isolierte Änderung: Der bereits aktive Tab erhält zusätzlich die Accent-Textfarbe. Dadurch bleibt der aktive Zustand neben Rahmen und Unterstreichung auch bei flüchtigem Blick klarer erkennbar. DOM und Interaktionslogik ändern sich nicht.

## Ergebnis und Freeze-Grenze

Der Block darf ausschließlich bei vollständig grünen relevanten Gates gemergt werden. Die finalen Run-IDs und der gebundene Repository-Fingerprint werden in I12-Evidence/Status geführt.

Kein I08-/I10-REOPEN ist erforderlich.

## Restrisiko

P1 besitzt weiterhin keine historische Public-Key-Retention, detached Signature Persistence, Rotation, Backup-/Restore-Integration oder Multi-Tab-Writer-Koordination. Diese Bereiche bleiben ausdrücklich getrennte Folgeentscheidungen.

## Nächster Schritt

Nach grünem Freeze dieses Blocks ausschließlich den nächsten I12-C-Masterplanpunkt auflösen. Keine der ausgeschlossenen Persistenzfunktionen implizit vorziehen.
