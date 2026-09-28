# I12-C – P3 Detached Signature Persistence Contract

## Zweck

Dieser Contract Gate friert ausschließlich die spätere browserlokale Persistenz bereits erfolgreich verifizierter `ssi-event-signature`-Records ein.

Noch keine Implementierung, keine DB-Version und keine Bootstrap-Verdrahtung.

## Sicherheitsvoraussetzung

Ein lokaler Write darf nur aus echter P2-LV-Evidence entstehen. Der spätere Application-Pfad MUSS den Record ausschließlich über `readVerifiedLocalSignatureRecord(evidence)` beziehen. Ein frei übergebener Record, ein Boolean wie `verified: true` oder serialisierte/kopierte Evidence ist keine zulässige Schreibgrundlage.

P3 verifiziert keine Signatur erneut. Die kryptografische Prüfung bleibt alleinige Verantwortung von P2-LV; P3 bewahrt deren exakt gebundenen Record-Snapshot unverändert auf.

## Spätere minimale APIs

### Application

`persistVerifiedLocalSignatureEvidence(evidence, capabilities)`

`capabilities` besitzt exakt:

- `readVerifiedLocalSignatureRecord(evidence)`
- `signatureStore` mit `putIfAbsent(record)`

Zusätzliche Signing-, Key-, Verify-, Event-Store-, Backup- oder Netzwerk-Capabilities sind fail-closed unzulässig.

### Infrastructure

`signatureStore.putIfAbsent(record)`

`signatureStore.readByEvent(worldId, eventId)`

Es gibt kein Update, Replace, Delete, Upsert, Clear oder Bulk-Write.

## Persistierter Record

Persistiert wird exakt der eingefrorene Detached-Signature-Record-v1 mit den bereits normierten Feldern:

- `format = "ssi-event-signature"`
- `format_version = 1`
- `world_id`
- `event_id`
- `author_id`
- `key_id`
- `algorithm = "Ed25519"`
- `signature`

P3 ergänzt keine Trust-, Verify-, Zeit-, Actor-Bindungs- oder Proof-Felder. Insbesondere werden weder P2-LV-Evidence noch `verified`-Status persistiert.

## Identität und No-Clobber

Die unveränderliche Storage-Identität lautet:

`[world_id, event_id, key_id]`

Damit bleiben mehrere historische Schlüssel-Nachweise für dasselbe Event unterscheidbar, ohne dass ein Record einen anderen überschreiben kann.

- Noch nicht vorhandene Identität: Record atomar anlegen.
- Vorhandener byte-/feldidentischer Record: idempotenter Erfolg ohne Mutation.
- Vorhandene Identität mit abweichendem Record: fail-closed Konflikt, bestehender Record unverändert.
- Kein erfolgreicher Write darf gemeldet werden, bevor die Transaktion vollständig committed ist.

## Readback

`readByEvent(worldId, eventId)` liefert eine neue, deterministisch nach `key_id` sortierte Liste exakter Record-Kopien.

Ungültige IDs werden vor Storage-Zugriff abgewiesen. Fehlende Records ergeben `[]`. Jeder gelesene Record wird vollständig gegen den eingefrorenen v1-Vertrag validiert; korrupte oder unbekannte Daten schlagen fail-closed fehl und werden weder repariert noch übersprungen.

Readback behauptet nur Persistenz, nicht aktuelle kryptografische Gültigkeit, Actor-Vertrauen oder Eventlog-Vollständigkeit. Konsumenten müssen I11/I12-Verifikation bei Bedarf erneut ausführen.

## Verbindliche Sequenz

1. Application-Capability-Surface exakt validieren.
2. `readVerifiedLocalSignatureRecord(evidence)` aufrufen.
3. Nur dessen exakten Record-Snapshot an `signatureStore.putIfAbsent(record)` übergeben.
4. Store validiert Record und zusammengesetzte Identität.
5. Store führt No-Clobber-Prüfung und gegebenenfalls Insert in einer Readwrite-Transaktion aus.
6. Erfolg erst nach vollständigem Commit zurückgeben.

Bei jedem Fehler endet die Sequenz ohne erfolgreiche Persistenzbehauptung.

## Datenbankgrenze

Die spätere Implementierung MUSS den bestehenden separaten I12-Datenbankbereich verwenden. I08-Event-Store, I09-Snapshot-Cache und I10-Backup/Restore werden weder geöffnet noch migriert.

Die konkrete additive I12-Datenbankversion, Store-/Indexnamen und Bootstrap-Verdrahtung werden erst im Implementierungsblock gebunden. Ein Upgrade MUSS bestehende P1-Signing-Keys und P2-Public-Keys unverändert erhalten.

## Fehleroberfläche

Der spätere Application-Pfad ergänzt exakt:

- `I12_SIGNATURE_PERSISTENCE_CAPABILITY_INVALID`
- `I12_SIGNATURE_PERSISTENCE_FAILED`

Ungültige oder gefälschte Evidence bleibt der bestehende P2-LV-Fehler `I12_LOCAL_SIGNATURE_EVIDENCE_INVALID`.

Der Store benötigt stabile Fehlerklassen für:

- ungültige Eingabe;
- Open-/Upgrade-Fehler;
- Konflikt mit derselben Identität;
- Write-/Clone-/Queue-/Transaction-Fehler;
- korrupten Readback.

Die konkreten Store-Codes werden im Implementierungsblock zusammen mit DB-Version und Adapter gebunden. Fehler enthalten weder private Schlüssel noch rohe Public-Key-Bytes oder Evidence-Interna.

## Contract-Tests

Die spätere Implementierung MUSS mindestens binden:

1. echte P2-LV-Evidence persistiert exakt ihren Record-Snapshot;
2. gefälschte, kopierte und serialisierte Evidence erzeugt keinen Store-Aufruf;
3. exakter Call-Trace `evidence read → putIfAbsent → commit → success`;
4. freier Record, `verified`-Boolean und zusätzliche Capabilities werden abgewiesen;
5. byteidentischer Duplicate ist idempotent;
6. gleiche `[world_id,event_id,key_id]` mit abweichendem Inhalt ist fail-closed und überschreibt nichts;
7. zwei verschiedene `key_id` für dasselbe Welt-Event bleiben getrennt lesbar;
8. Readback ist deterministisch nach `key_id` sortiert und liefert defensive Kopien;
9. ungültige IDs und korrupte Records schlagen fail-closed fehl;
10. injizierte Open-, Clone-, Queue-, Transaction- und Abort-Fehler behaupten keinen Erfolg und hinterlassen keinen Teilwrite;
11. Upgrade erhält bestehende P1-/P2-Daten bytegleich;
12. API besitzt keine Update-/Replace-/Delete-/Clear-/Bulk-Funktion;
13. kein Zugriff auf I08-, I09- oder I10-Stores;
14. realer Chromium-Readback nach erfolgreichem Commit.

## Non-Goals

- keine P3-Implementierung in diesem Gate;
- keine DB-Version, Store-Anlage oder Schemaänderung;
- keine Signaturerzeugung oder erneute Verifikation;
- keine P1-/P2-/P2-L-/P2-LI-/P2-LV-Änderung;
- keine Rotation oder Schlüssellöschung;
- keine Actor↔Key-Trust-Persistence;
- kein Authenticity Export oder Trusted-Checkpoint-Store;
- keine Synchronisation oder Netzwerk-Persistenz;
- kein Backup-/Restore-REOPEN;
- keine UI-/Visual-World-Änderung;
- kein I08-/I10-REOPEN.

## Exit-Gates

1. nur echte P2-LV-Evidence darf einen Write auslösen;
2. persistiertes Format bleibt exakt Signature Record v1;
3. zusammengesetzte Identität und No-Clobber-Regeln sind eingefroren;
4. minimale Write-/Read-APIs sind eingefroren;
5. Readback- und Korruptionspolitik ist fail-closed;
6. Commit-vor-Erfolg und atomarer Fehlerpfad sind verbindlich;
7. P1-/P2-Upgrade-Erhalt ist Testpflicht;
8. stabile Application-Fehler und Store-Fehlerkategorien sind festgelegt;
9. Contract- und Chromium-Tests sind vollständig geplant;
10. keinerlei Produktcode oder DB-Mutation in diesem Gate;
11. Rotation, Export, Trusted Checkpoint und Backup bleiben separat;
12. I08/I10 bleiben geschlossen;
13. Repository Quality ist grün.

## Nächster Schritt

Nach grünem Freeze ausschließlich den kleinsten P3-Implementierungsblock mit Adapter, Application-Barriere und gezielten Contract-/Chromium-Tests eröffnen.

Rotation, Authenticity Export und Trusted-Checkpoint-Persistence bleiben gesperrt.
