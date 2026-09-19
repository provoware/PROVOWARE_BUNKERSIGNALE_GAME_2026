# I10 - Storage Health + Export Backup

## Verbindlicher Scope

I10 schützt die lokale Weltpersistenz in zwei getrennten Schritten:

1. **Storage Health** liest den Browser-Speicherzustand ausschließlich read-only und klassifiziert die geschätzte Belegung.
2. **Export Backup + Restore** definiert einen vollständigen, versionierten Welt-Backup-Vertrag und stellt später einen validate-before-mutate Restore bereit.

Die I10-P0 Game UI Regression Shell bleibt unverändert und dient während des gesamten Checkpoints als visuelle Regression-Basis.

## Architektur und Owner

### Storage Health

- **Infrastructure Owner:** `app/infrastructure/browser/storage-health.js`
  - liest ausschließlich `navigator.storage.estimate()` und, falls verfügbar, `navigator.storage.persisted()`;
  - ruft **nicht** `navigator.storage.persist()` auf;
  - übersetzt Browserfehler in einen stabilen read-only Ergebnisvertrag.
- **Application Owner:** `app/application/storage-health.js`
  - klassifiziert ausschließlich bereits gelesene Werte;
  - besitzt keine Browser-, DOM- oder IndexedDB-Abhängigkeit.
- **UI:** zeigt nur das vom Application-Layer gelieferte Modell; keine direkte Storage-API-Nutzung.

### Export / Restore

Der spätere Export liest die autoritativen I08-Events einer Welt und erzeugt einen deterministischen Backup-Vertrag. Der I09-Snapshot-Cache wird **nicht** exportiert, weil er verwerfbar und nicht autoritativ ist.

Restore validiert den vollständigen Backup-Vertrag, bevor irgendein persistenter Schreibzugriff beginnt. Ein vorhandenes Ziel wird niemals überschrieben.

## Quota- und Persistenzstatus

Browserwerte sind **Schätzwerte**, keine Aussage über den freien Platz des gesamten Datenträgers.

Ein Storage-Health-Sample enthält:

- `supported`: Storage Manager / Estimate verfügbar,
- `usage_bytes`: geschätzte belegte Origin-Bytes oder `null`,
- `quota_bytes`: geschätzte Origin-Quota oder `null`,
- `persisted`: `true`, `false` oder `null`,
- `error_code`: stabiler interner Fehlercode oder `null`.

`persisted === false` bedeutet Browser-Standard-/Best-Effort-Speicherung. Das ist **kein Kapazitätsfehler** und verändert die Quota-Ampel nicht.

## Warnschwellen

Die Kapazitätsampel basiert ausschließlich auf `usage_bytes / quota_bytes`:

| Status | Belegung |
| --- | ---: |
| `normal` | < 75 % |
| `warning` | >= 75 % und < 90 % |
| `critical` | >= 90 % |
| `unknown` | API/Estimate fehlt, fehlschlägt oder liefert keinen gültigen positiven Quota-Wert |

Grenzwerte sind inklusive: exakt 75 % ist `warning`, exakt 90 % ist `critical`.

Die Klassifikation darf Werte >100 % nicht crashen; sie bleiben `critical`. Negative oder nicht endliche Werte werden als `unknown` behandelt.

## Export-Backup-Vertrag v1

Der spätere deterministische JSON-Vertrag lautet fachlich:

- `format = "ssi-world-backup"`,
- `format_version = 1`,
- `world_id`,
- `product_version` als Herkunftsinformation,
- `content_lock_fingerprint` für die benötigte lokale Content-Basis,
- `event_count`,
- `events`: vollständige I06-Event-Envelopes in deterministischer Welt-Reihenfolge.

Nicht Bestandteil des Backups:

- I09-Snapshots,
- Browser-Quota/Persistenzstatus,
- UI-State,
- temporäre Diagnosewerte,
- Hashkette I11,
- Signaturen/Crypto I12.

Ein identischer autoritativer Weltstand soll denselben kanonischen Backup-Inhalt ergeben; deshalb enthält v1 keinen Exportzeitstempel im autoritativen Payload.

## Restore-Vertrag

Restore MUSS vor dem ersten Write vollständig prüfen:

1. JSON lesbar und exaktes Backupformat/-version,
2. `world_id` gültig,
3. `event_count` stimmt exakt mit der Eventliste überein,
4. jedes Event erfüllt I06 und kanonischen Readback,
5. Eventreihenfolge/Sequenz-/Lamport-Invarianten bleiben replaybar,
6. `content_lock_fingerprint` ist mit der lokalen Basis kompatibel,
7. Zielwelt enthält noch keine Events.

Erst danach darf ein atomarer Event-Store-Write beginnen. Jeder Fehler oder Abort führt zu **null partiell restaurierten Events**.

## Fehler- und Datenverlustpfade

- Storage API fehlt -> `unknown`, Anwendung bleibt nutzbar.
- `estimate()` schlägt fehl -> Kapazität `unknown`, aber ein separat lesbarer Persistenzstatus bleibt erhalten; keine rohe Browserexception bis zur UI.
- `persisted()` schlägt fehl -> Kapazitätsmessung bleibt nutzbar, Persistenzstatus wird `unknown`.
- Export-Read schlägt fehl -> keine unvollständige Backup-Datei als erfolgreich melden.
- Backup ist trunkiert, schemafalsch oder inkonsistent -> Restore vor jedem Write ablehnen.
- Content-Basis inkompatibel -> Restore ohne Mutation ablehnen.
- Zielwelt existiert bereits -> no-clobber, Restore ohne Mutation ablehnen.
- Restore-Transaktion abortiert -> keine Teilwelt.
- I09-Cachefehler sind für Export/Restore nicht autoritativ und dürfen Events nicht verändern.

## Non-Goals

- kein automatischer Aufruf von `navigator.storage.persist()`,
- keine Betriebssystem-/Datenträger-Freiplatzmessung,
- keine automatische Löschung bei Speicherknappheit,
- keine Snapshot-Backups,
- keine Hashverkettung I11,
- keine Signatur-/Crypto-Abstraktion I12,
- keine Recovery-Startpipeline I13,
- kein Multi-Tab-Writer-Guard I14,
- keine Gameplay- oder Content-Aktivierungslogik.

## Umsetzungsreihenfolge

### I10-A - Storage Health Foundation

Kleinster Produktblock:

- Storage-Estimate/Persisted read-only lesen,
- deterministisch klassifizieren,
- Diagnose read-only anzeigen,
- fehlende/fehlerhafte API fail-soft als `unknown`,
- kein Export/Restore.

### I10-B - Export Backup

Nach grünem I10-A:

- registriertes `world-backup/1.0.0`-Schema,
- Runtime-Validator für exakte Top-Level-Felder, vollständige I06-Event-Invarianten und streng steigende Replay-Sequenz,
- kanonischer JSON-Serializer mit LF-Normalisierung, stabiler Schlüsselreihenfolge und verlustfreier Behandlung aller legalen JSON-Schlüssel einschließlich `__proto__`,
- read-only Welt-Readback ausschließlich über injiziertes I08-`readWorld(worldId)`,
- deterministische Exportbytes bei identischem autoritativem Weltstand,
- 1000-Event-Chromium-Smoke: zwei vollständige Exporte zusammen < **5000 ms**,
- noch **kein** Dateidownload; Download darf erst nach vollständig erfolgreicher Erzeugung ergänzt werden.

### I10-C - Restore

Nach grünem I10-B:

- vollständige Preflight-Validierung im Application-Layer,
- exakte Content-Lock-Kompatibilitätsprüfung vor jeder Schreibfähigkeit,
- atomare Infrastructure-Capability `restoreIfEmpty(worldId, events)`,
- Zielwelt-Leerprüfung und kompletter Event-Batch in **derselben IndexedDB-Readwrite-Transaktion**,
- vorhandene Zielwelt -> no-clobber ohne Mutation,
- injizierter Abort -> null partielle Events,
- Export -> Restore -> Re-Export byteidentisch,
- byteidentischer autoritativer Eventstrom + eingefrorener deterministischer I07-Reducer -> identischer Replay-Zustand,
- 1000-Event-Restore-/Paritäts-Smoke < **5000 ms**.

## Exit-Gates I10

I10 darf nur eingefroren werden, wenn:

1. Storage Health bei gültigem Estimate die Grenzwerte 75 % / 90 % exakt klassifiziert.
2. fehlende oder fehlerhafte Storage-API zu `unknown` führt, ohne App-Abbruch.
3. Persistenzstatus getrennt von Kapazitätsstatus dargestellt wird.
4. Export v1 ausschließlich autoritative Events und notwendige Kompatibilitätsmetadaten enthält; I09-Snapshotdaten fehlen.
5. identischer Weltstand deterministische Backupbytes erzeugt.
6. trunkiertes/ungültiges Backup vor jedem Write abgewiesen wird.
7. inkompatible Content-Basis und vorhandene Zielwelt no-clobber ohne Mutation abgewiesen werden.
8. Restore-Abort keine partiellen Events hinterlässt.
9. Export -> Restore -> vollständiger Replay denselben abgeleiteten Zustand ergibt.
10. 1000-Event-Export/Restore-Smoke innerhalb des dokumentierten Budgets bleibt.
11. Repository Quality, allgemeiner Chromium-Smoke und I10 Game UI Regression Shell grün bleiben.
12. finaler Diff keine I11+-Funktion vorzieht.

Verbindliche Gates: **G1, G4, G6, G7 und G8**.

## Aktueller Umsetzungsstand

- **I10-A Storage Health Foundation:** implementiert auf diesem Branch; read-only Estimate/Persistenzstatus, Grenzwertklassifikation, Diagnoseanzeige und Chromium-Gate.
- **I10-B Export Backup:** implementiert: Schema/Registry, Validator, kanonischer Serializer, read-only I08-Readback und 1000-Event-Determinismus-Smoke; noch kein Download.
- **I10-C Restore:** implementiert: Preflight-Core, atomare no-clobber IndexedDB-Capability, Abort-Rollback und Export→Restore→Re-Export-Paritätsgate.

I10-C vervollständigt den fachlichen I10-Produktumfang. Der finale Freeze-Status wird über `evidence/I10_EVIDENCE.json` und `status/I10_STATUS.json` an den governeden Repository-Fingerprint gebunden.

## Restrisiko


`navigator.storage.estimate()` liefert browserabhängige Origin-Schätzwerte und ersetzt keine Betriebssystem-Datenträgerdiagnose. Kryptografische Autoren-/Eventintegrität beginnt erst in I11/I12.

