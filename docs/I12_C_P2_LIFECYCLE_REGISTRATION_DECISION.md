# I12-C – P2-L Lifecycle Registration Barrier Decision

## Zweck

Dieser Decision Gate klärt ausschließlich, ob zwischen dem grün eingefrorenen P2 Public-Key-Store und P3 Detached Signature Persistence noch eine Lifecycle-Orchestrierung erforderlich ist.

**Entscheidung: Ja.** Vor P3 wird ein eigener **P2-L Lifecycle Registration Barrier** eingefroren.

Noch keine Application-Implementierung in diesem Gate.

## Problem

P1 hält den aktiven privaten und öffentlichen `CryptoKey`.

P2 hält die historische, unveränderliche öffentliche Byte-Wahrheit pro `key_id`.

Beide Stores sind grün, aber ohne zusätzliche Orchestrierung existiert noch keine harte Garantie, dass ein Schlüssel **vor seiner ersten Signaturverwendung** bereits in P2 historisch auflösbar ist.

Würde P3 jetzt Signaturen persistieren, könnte ein Signature Record mit einem `key_id` entstehen, dessen Public Key nicht dauerhaft in P2 registriert wurde. Das verletzt die bereits eingefrorene Reihenfolge P2 → P3.

## Entscheidung

Vor jedem Signiervorgang gilt eine verpflichtende **Registration Barrier**:

1. P1 `readActive()` liefert den aktiven Schlüssel.
2. Fehlt der aktive Schlüssel, schlägt der Signiervorgang fail-closed fehl.
3. Der öffentliche P1-`CryptoKey` wird über die bestehende I12-B-`exportEd25519PublicKey`-Capability als exakt 32 rohe Bytes exportiert.
4. Aus genau diesen Bytes wird über die bestehende I12-A-`deriveKeyId`-Capability der `key_id` abgeleitet.
5. Der abgeleitete `key_id` muss exakt dem in P1 gespeicherten `key_id` entsprechen.
6. Der P2-Record `{ key_id, algorithm: "Ed25519", public_key_bytes }` wird über P2 `putIfAbsent()` registriert.
7. Erst wenn P2 erfolgreich bestätigt hat, darf die Application `signEventDetached(...)` beziehungsweise die konkrete Sign-Capability aufrufen.

Jeder Fehler in Schritt 1–6 blockiert Signieren.

## Atomizität

Es ist **keine gemeinsame P1/P2-Write-Transaktion** erforderlich oder erlaubt:

- P1 wird in dieser Barriere ausschließlich gelesen.
- P2 führt den einzigen Write aus.
- P2-`putIfAbsent` besitzt bereits seine eigene atomare No-Clobber-`readwrite`-Transaktion.

Die Sicherheitsgarantie ist daher eine **Application-seitige Sequenzbarriere**:

`P1 read → public export → key_id verify → P2 putIfAbsent → sign`

Nicht:

`sign → später irgendwann P2 registrieren`.

Signieren vor erfolgreicher Registrierung ist verboten.

## Idempotenz

Ist derselbe Public Key bereits in P2 registriert, bleibt `putIfAbsent` idempotent erfolgreich.

Damit darf die Registration Barrier vor **jedem** Signiervorgang ausgeführt werden, ohne unnötige Sonderzustände einzuführen.

Ein Konflikt bei gleichem `key_id` und anderen Bytes bleibt fail-closed und blockiert Signieren.

## Ownership

Die Orchestrierung gehört in die **Application-Schicht**.

Infrastructure stellt ausschließlich die bereits vorhandenen Capabilities bereit:

- P1: `readActive()`
- I12-B: `exportEd25519PublicKey(publicKey)`
- I12-A: `deriveKeyId(publicKeyBytes)`
- P2: `putIfAbsent(record)`
- Sign-Capability nach erfolgreicher Barriere

Domain, I06, I08 und UI erhalten keine IndexedDB-/`CryptoKey`-Abhängigkeit.

## Minimaler geplanter Vertrag

Der spätere kleinste P2-L-Implementierungsblock soll genau eine Orchestrierungsfunktion bereitstellen, sinngemäß:

`ensureActiveSigningKeyRegistered(...)`

Ergebnis:

- Erfolg: liefert mindestens den bestätigten `key_id` und die registrierten Public-Key-Bytes oder einen äquivalenten unveränderlichen Rückgabewert;
- Fehler: stabile Application-Fehleroberfläche, kein Signiervorgang.

Die konkrete Funktionssignatur und Fehlercodes werden erst im P2-L-Contract-Block eingefroren.

## Geplante Contract-Fälle

Vor P2-L-Implementierung müssen mindestens folgende Fälle vertraglich gebunden werden:

1. kein aktiver P1-Key → fail-closed;
2. gültiger P1-Key → Export raw32 → `key_id` stimmt → P2 registriert → Erfolg;
3. P1-`key_id` stimmt nicht zu exportierten Bytes → fail-closed, kein P2-Write;
4. Exportfehler → fail-closed;
5. `deriveKeyId`-Fehler → fail-closed;
6. P2 idempotenter Duplicate → Erfolg;
7. P2 Konflikt/Storagefehler → fail-closed;
8. Sign-Capability wird vor erfolgreicher Barriere **nie** aufgerufen;
9. nach erfolgreicher Barriere darf genau der bestätigte `key_id` zum Signieren verwendet werden;
10. P1 und P2 APIs bleiben unverändert.

## Non-Goals

- keine neue Persistence;
- keine DB-Versionserhöhung oder Migration;
- keine Änderung an P1/P2 Infrastructure;
- keine detached Signature Persistence;
- keine Rotation;
- keine Actor↔Key-Trust-Persistence;
- keine Backup-/Restore-Erweiterung;
- keine Trusted-Checkpoint-Persistence;
- keine UI-Änderung;
- kein I08-/I10-REOPEN;
- keine I13-/I14-Funktion.

## Freeze-Grenzen

Byteunverändert bleiben in diesem Decision Gate:

- `app/infrastructure/browser/indexeddb-signing-key-store.js`
- `app/infrastructure/browser/indexeddb-public-key-store.js`
- `app/application/event-signature.js`
- I06/I08/I09/I10/I11-Verträge
- P1/P2 Browser-Smokes und Store-Semantik

## Exit-Gates dieses Decision Gates

1. P2-L ist als verpflichtender Zwischenblock vor P3 dokumentiert.
2. Reihenfolge `P1 read → export → derive/verify → P2 register → sign` ist verbindlich.
3. Signieren ohne erfolgreiche P2-Registrierung ist ausdrücklich fail-closed verboten.
4. Keine Cross-Store-Write-Transaktion wird erfunden.
5. P1 und P2 bleiben unverändert.
6. P3 bleibt gesperrt.
7. Kein Produkt-, DB-, Schema-, UI- oder Testcode wird verändert.
8. I08/I10 bleiben geschlossen.
9. Repository Quality ist nach Evidence-Neubindung grün.
10. Finaler Diff enthält ausschließlich Masterplan/Decision-Dokumentation, Change Record und I12-Evidence/Status.

## Restrisiko

Die konkrete Application-Funktion, Fehlercodes und die Integration mit dem bestehenden Sign-Orchestrator sind noch offen. Dieses Decision Gate erlaubt noch keine Implementierung.

## Nächster Schritt

Nach grünem Freeze ausschließlich den **P2-L Contract Gate – Active Key Registration Barrier** eröffnen.

Erst nach grün eingefrorenem P2-L darf P3 Detached Signature Persistence als eigener Contract Gate eröffnet werden.
