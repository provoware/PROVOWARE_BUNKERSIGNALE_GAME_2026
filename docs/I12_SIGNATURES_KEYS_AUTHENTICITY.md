# I12 – Signatures, Keys & Authenticity

## Zweck

I12 ergänzt den eingefrorenen I11-Integritätsvertrag um einen **detached kryptografischen Authentizitätsnachweis**. I11 beantwortet, ob der Eventstrom und seine Reihenfolge unverändert sind. I12 beantwortet zusätzlich, ob ein Signaturnachweis mit einem bekannten öffentlichen Schlüssel gültig ist.

I12 behauptet **keine reale Personenidentität**. Ohne einen separat verifizierten Actor→Key-Vertrauensanker bedeutet eine gültige Signatur ausschließlich: Der passende private Schlüssel hat die gebundenen Daten signiert.

## Verbindlicher Scope

1. I12 baut ausschließlich auf einem bereits erfolgreichen I11-Hash-Chain-Verify auf.
2. I06-Event-Envelopes werden nicht erweitert und bestehende I08-Events nicht mutiert.
3. Signaturen bleiben detached und werden über stabile IDs mit Event und Schlüsselbezug verknüpft.
4. Primärer Signaturalgorithmus für I12 v1 ist **Ed25519** über Web Crypto / SubtleCrypto.
5. Fehlende Ed25519-Capability führt fail-closed zu "unsupported"; es gibt keinen stillen Algorithmus-Fallback.
6. Öffentliche Schlüssel dürfen exportiert und zur Verifikation verteilt werden; private Schlüssel werden im Produktpfad standardmäßig als **nicht extrahierbar** geplant.
7. Ein stabiler `key_id` wird deterministisch aus dem öffentlichen Schlüssel abgeleitet; die konkrete Byteform und Ableitung werden vor Runtime-Code durch feste Testvektoren eingefroren.
8. Actor↔Key-Bindung ist ein eigener Vertrauensvertrag. Ein `actor_id` im Event allein beweist keine Schlüsselinhaberschaft.
9. Signaturprüfung verändert weder Eventlog, Hashkette, Snapshot noch Weltzustand.
10. Jede persistente Schlüssel- oder Signaturablage wird erst in I12-C nach explizitem Persistence/Recovery-Gate freigegeben.

## Architektur

- **Application:** erzeugt die zu signierenden Bytes, orchestriert Signieren/Verifizieren und erzwingt I11-vor-I12.
- **Infrastructure:** kapselt Web-Crypto-Schlüsseloperationen, Capability Detection und später gegebenenfalls einen separaten Key-/Signature-Store.
- **Domain:** enthält keine Browser-, IndexedDB- oder CryptoKey-Abhängigkeit.
- **UI:** darf später nur abgeleiteten Status anzeigen; keine direkte Crypto-/Storage-Nutzung.
- **Bootstrap:** verdrahtet konkrete Crypto-/Storage-Capabilities.

## Detached Signature Record v1

Der geplante Record enthält mindestens:

- `format = "ssi-event-signature"`
- `format_version = 1`
- `world_id`
- `event_id`
- `author_id`
- `key_id`
- `algorithm = "Ed25519"`
- `signature` als kanonisch definierte Base64url-Darstellung

Der Record ist **kein Teil des I06-Event-Envelopes**.

Vor jeder Schlüssel-/Trust-Auswertung MUSS `record.world_id` zur geprüften Welt, `record.event_id` zum geprüften Event und insbesondere `record.author_id` exakt zu `event.author_id` des bereits validierten I06-Events passen. Jede Abweichung ist ein fail-closed Authentizitätsfehler. Die detached Metadaten dürfen niemals eine vom signierten Event abweichende Autorenzuordnung erzeugen.

## Signierte Bytes v1

I12 signiert nicht nur nackte Eventbytes. Die Signatur wird an den geprüften I11-Kontext gebunden, damit ein gültiger Nachweis nicht still in eine andere Welt oder Kettenposition transplantiert werden kann.

Für I12-A ist folgende versionierte Rahmung als exakter Byte-Testvektor eingefroren:

`provoware:i12:event-signature:v1\n`
+ `<world_id>\n`
+ `<previous_hash>\n`
+ `<event_hash>\n`
+ `<canonical UTF-8 I06 event bytes>`

Vor Signaturprüfung MUSS das zugehörige I11-Kettenglied bereits erfolgreich gegen Event und Kette verifiziert sein. Zusätzlich wird der aktuelle Event-Inhalt erneut kanonisch serialisiert und sein I11-Hash aus `previous_hash + canonicalEventBytes(event)` nachgerechnet. Ein bloß weitergereichtes `i11Verified: true` genügt nicht; stimmt der aktuelle Event-Hash nicht exakt mit `chainEntry.event_hash` überein, schlägt Signieren fehl und Verifizieren liefert fail-closed `false`.

### Eingefrorener I12-A-Testvektor

Für `world:000000000000000000000001`, Genesis-`previous_hash`, den eingefrorenen I11-Test-`event_hash` `b583335b4025c08e3cd2c3ae9324edde696d05450ef2744b721e59fd20f6fc31` und dasselbe kanonische Standard-Testevent ergibt SHA-256 über die **gerahmten Signaturbytes**:

`38aea67e517ee1458df28c0b6a73b2aa51c812e9baafb862ac9656b75d78a4a1`

Die Tests binden zusätzlich die vollständige Bytefolge selbst; Änderungen an Domänentrennung, LF-Trennern, Welt-ID, I11-Hashes oder kanonischen Eventbytes sind damit Vertragsänderungen.

## `key_id` v1

`key_id` ist kein gekürzter Domain-Identifier, sondern ein vollständiger kryptografischer Fingerprint:

`key:sha256:<64 lowercase hex>`

Die Eingabe für SHA-256 lautet exakt:

`provoware:i12:key-id:v1\n` + `<32 rohe Ed25519-Public-Key-Bytes>`

Für die Testbytes `00 01 02 ... 1f` ist der verbindliche Vektor:

`key:sha256:ceb5f9a1d844ca3caef169e8d22b9f39875346044fe2d040131414fba6350a64`

I12-A kennt dabei noch keinen Browser-`CryptoKey`; es verarbeitet ausschließlich bereits vorliegende Public-Key-Bytes plus injizierte SHA-256-Funktion.

## Coverage + Trusted Checkpoint

Per-Event-Signaturen beweisen ausschließlich die Authentizität der jeweils vorhandenen, geprüften Events. Sie beweisen **nicht allein**, dass das lokale Eventlog vollständig ist. Wird ein gültiger Suffix aus Events und zugehörigen detached Signaturen gemeinsam entfernt, kann der verbleibende Präfix intern weiterhin korrekt sein.

Für eine Aussage wie **"vollständig / kein Suffix-Rollback"** verlangt I12 daher zusätzlich einen vertrauenswürdigen erwarteten Checkpoint außerhalb des zu prüfenden veränderlichen Event-/Signature-Sets.

Der geplante `ssi-world-checkpoint` v1 bindet mindestens:

- `format = "ssi-world-checkpoint"`
- `format_version = 1`
- `world_id`
- `event_count`
- `head_event_id`
- `head_hash`
- `key_id`
- `algorithm = "Ed25519"`
- `signature`

Die Checkpoint-Signatur besitzt eine eigene versionierte Domänentrennung; Rahmung und Suffix-Truncation-Vektor sind im eingefrorenen I12-A-Core festgelegt.

Verifikation gegen einen trusted checkpoint ist fail-closed:

1. Ein **extern konfigurierter** `expectedKeyId` muss vorhanden sein; `record.key_id` darf den Trust Anchor nicht selbst auswählen und muss exakt diesem erwarteten Schlüssel entsprechen.
2. `world_id` muss identisch sein.
3. Coverage-Metadaten werden **nicht** als frei übergebenes `actual` akzeptiert. I12 erhält `events + chain`, führt mit den injizierten kanonischen Eventbytes und SHA-256-Capabilities erneut `verifyHashChain(...)` aus und leitet erst nach erfolgreicher I11-Prüfung die Coverage ab.
4. Der verifizierte Eventcount muss exakt `event_count` entsprechen.
5. Das letzte Event des verifizierten Streams muss exakt `head_event_id` entsprechen.
6. Der Hash des letzten verifizierten I11-Kettenglieds muss exakt `head_hash` entsprechen.
7. Die Checkpoint-Signatur muss mit dem extern erwarteten Public Key gültig sein.

Damit kann weder ein untrusted Checkpoint seinen eigenen Schlüssel zum Vertrauensanker erklären noch ein frei konstruiertes/cached Coverage-Objekt eine erfolgreiche I11-Prüfung vortäuschen.

Fehlt ein solcher vertrauenswürdiger Checkpoint, darf I12 **keine Rollback-/Vollständigkeitsgarantie** behaupten. Die zulässige Aussage bleibt dann auf "vorhandene Events intern integer und signiert" begrenzt.

Wo der trusted checkpoint später gespeichert, exportiert oder wiederhergestellt wird, ist ausdrücklich **noch keine Persistence-Entscheidung**. Diese Frage bleibt I12-C vorbehalten.

## Schlüsselidentität und Vertrauen

I12 trennt drei Aussagen strikt:

1. **Integrität:** I11-Kette ist korrekt.
2. **Kryptografische Authentizität:** Signatur passt zum öffentlichen Schlüssel.
3. **Actor-Vertrauen:** Der verwendete Schlüssel ist für den behaupteten `author_id` vertrauenswürdig gebunden.

Nur wenn alle für einen Use-Case erforderlichen Ebenen grün sind, darf die UI einen entsprechend präzisen Status anzeigen. Begriffe wie "Person bestätigt" oder "Identität bewiesen" sind ohne externen Vertrauensanker verboten.

## Schlüssel-Lifecycle

Verbindliche Regeln für die spätere Umsetzung:

- Schlüsselgenerierung ausschließlich über Browser-Crypto-Capability.
- Privater Schlüssel: Signieren erlaubt, Export standardmäßig verboten.
- Öffentlicher Schlüssel: Verify + Export erlaubt.
- Kein privates Schlüsselmaterial in Logs, Fehlermeldungen, Change Records oder Evidence.
- Kein automatischer Ersatz eines vorhandenen Schlüssels.
- Rotation erzeugt einen neuen `key_id`; alte Signaturen müssen mit dem damaligen öffentlichen Schlüssel prüfbar bleiben.
- Löschung/Verlust eines privaten Schlüssels darf keine bestehenden Events oder Signaturen verändern.
- Recovery/Backup privater Schlüssel ist **nicht implizit erlaubt** und benötigt eine eigene I12-C-Entscheidung.

## Umsetzungsreihenfolge

### I12-A – Contract + deterministic verification core

- Signature-Record-v1-Vertrag und exakte Feldregeln definieren.
- Byte-Rahmung und `key_id`-Ableitung mit festen Vektoren einfrieren.
- detached Sign/Verify-Orchestrierung als injizierte Capabilities planen/implementieren.
- I11-vor-I12 als harte Vorbedingung testen.
- Negativfälle: falsche Welt, falsches Event, `record.author_id != event.author_id`, falscher Kettenhash, falscher Schlüssel, veränderte Signatur.
- Coverage-Vertrag für trusted checkpoint und Suffix-Truncation als separaten Testvektor festschreiben; noch keine Ablage implementieren.
- Noch keine Persistenz.

### I12-B – Browser Ed25519 adapter

Erst nach grünem I12-A:

- Ed25519 Capability Detection über `SubtleCrypto`.
- generate/sign/verify/import/export-public hinter Infrastructure-Adapter.
- stabile Fehlerübersetzung ohne rohe DOMException bis zur UI.
- privater Produkt-Schlüssel nicht extrahierbar.
- Chromium-Smoke mit bekanntem Vektor und Manipulationsfällen.
- reproduzierbares 1000-Verify-Performanceprofil.

**Aktueller I12-B-Stand:** Capability Detection, non-extractable Key Generation, Sign/Verify, Public-Key Import/Export und der reale Chromium-Krypto-Smoke sind grün eingefroren. Der aktuelle Teilblock ergänzt ausschließlich das offene Performanceprofil: nach 10 Warm-up-Verifikationen werden 1000 sequenzielle Ed25519-Verifikationen im echten Chromium gemessen. Der CI-Regressionsgrenzwert beträgt 5000 ms und ist ein Gate-Wert, kein Leistungsversprechen für Endgeräte. KeyStore, Persistenz, Recovery, Rotation und I12-C bleiben gesperrt.

### I12-C – Key lifecycle + persistence/recovery decision gate

Erst nach grünem I12-B:

- entscheiden, ob private `CryptoKey`-Objekte und detached Signature Records persistent gespeichert werden müssen;
- falls ja: ausschließlich separaten I12-Store bevorzugen, keine stillen I08-/I10-Schemaänderungen;
- Rotation, Lost-Key, public-key retention und no-clobber-Verhalten festlegen;
- explizit entscheiden, ob Backup/Restore erweitert werden muss;
- jede Änderung an I08/I10 verlangt vor dem Patch einen dokumentierten REOPEN.

## Non-Goals

- keine Verschlüsselung von Welt- oder Eventdaten,
- kein Passwortsystem,
- keine Server-/PKI-/Certificate-Authority,
- keine Behauptung realer menschlicher Identität,
- keine Netzwerk-Key-Discovery,
- keine Änderung am I06-Envelope,
- keine Mutation des I08-Eventlogs,
- kein Persistieren der I11-Hashkette,
- kein automatischer Recovery-/Repair-Flow aus I13,
- kein Multi-Tab-Writer-/Key-Lock aus I14,
- kein Algorithmus-Fallback ohne neue Vertragsversion.

## Exit-Gates I12

I12 darf nur eingefroren werden, wenn:

1. I11-Verifikation zwingend vor jeder I12-Authentizitätsbewertung erfolgt.
2. identische Signatur-Inputs byteidentisch gerahmt werden.
3. `key_id` deterministisch und durch feste Vektoren gebunden ist.
4. gültige Ed25519-Signatur mit passendem Public Key erfolgreich verifiziert.
5. Event-, Welt-, Kettenhash-, Schlüssel- oder Signaturmanipulation fail-closed erkannt wird.
6. `record.author_id` vor jeder Trust-Auswertung exakt an `event.author_id` gebunden und ein Mismatch fail-closed abgewiesen wird.
7. Actor↔Key-Vertrauensstatus getrennt von bloßer Signaturgültigkeit modelliert ist.
8. Suffix-Truncation nur dann als ausgeschlossen gilt, wenn Eventcount und Kettenkopf gegen einen gültigen trusted checkpoint geprüft wurden; ohne Checkpoint wird keine Vollständigkeitsgarantie behauptet.
9. private Schlüssel im Produktpfad nicht versehentlich exportiert oder geloggt werden.
10. fehlende Web-Crypto-/Ed25519-Capability stabil und ohne Fallback behandelt wird.
11. 1000 sequenzielle Verifikationen nach 10 Warm-up-Läufen im dokumentierten Chromium-Smoke-Budget von 5000 ms bleiben.
12. I06/I08/I09/I10/I11 ohne begründeten REOPEN unverändert bleiben.
13. Repository Quality + allgemeiner Chromium-Smoke + I12-spezifischer Crypto-Smoke grün bleiben.
14. finaler Diff keine I13+-Recovery- oder I14+-Multi-Tab-Funktion vorzieht.

## Freeze-Regel

I12-Evidence und Status werden erst nach vollständig grünen finalen Gates an den governeden Repository-Fingerprint gebunden. I13 bleibt bis dahin gesperrt.
