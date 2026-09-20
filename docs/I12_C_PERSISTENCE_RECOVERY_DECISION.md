# I12-C – Persistence / Recovery Decision

## Entscheidung

I12-C wird als reiner Decision Gate eröffnet. Für den aktuellen Produktvertrag gelten folgende Entscheidungen:

1. **Private Ed25519-CryptoKeys müssen lokal persistent sein**, wenn derselbe Signaturschlüssel über Browser-Neustarts hinweg weiterverwendet werden soll. Ein Neustart darf nicht still einen neuen Schlüssel erzeugen oder den aktiven Schlüssel ersetzen.
2. **Detached Signature Records müssen lokal persistent sein**, wenn kryptografische Authentizität historischer Events nach Neustart erhalten bleiben soll. Sie sind abgeleitete Authentizitätsnachweise, keine neue fachliche Event-Wahrheit.
3. **Public Keys müssen historisch erhalten bleiben**, solange Signaturen mit dem jeweiligen `key_id` verifiziert werden können müssen. Rotation darf alte Public Keys nicht überschreiben.
4. **Trusted Checkpoints dürfen nicht allein aus demselben veränderlichen lokalen Event-/Signature-Set abgeleitet werden.** Eine lokale Kopie darf später als Cache dienen, begründet allein aber keine Rollback-/Vollständigkeitsgarantie.
5. **I10 World Backup v1 bleibt unverändert.** Private nicht-extrahierbare Schlüssel gehören nicht in das JSON-Weltbackup. I08-Events, I09-Snapshots und I10-Backupverträge bleiben unverändert.
6. Wenn später Portabilität von Authentizitätsnachweisen benötigt wird, ist dafür ein **separates I12-Authenticity-Exportformat** vorzusehen. Dieses darf Public Keys, detached Signatures und gegebenenfalls extern verankerte Checkpoint-Evidence enthalten, aber **kein privates Schlüsselmaterial**.
7. **Private-Key-Recovery ist für I12 v1 nicht zugesagt.** Verlust eines privaten Schlüssels beendet nur die Fähigkeit, mit diesem Schlüssel neue Daten zu signieren; bestehende Events und Signaturen bleiben unverändert.
8. **Rotation ist ausschließlich explizit.** Sie erzeugt einen neuen `key_id`; alte Signaturen bleiben mit dem damaligen Public Key prüfbar. Es gibt keinen automatischen Schlüsselersatz.
9. **Kein I08- oder I10-REOPEN ist für diese Entscheidung erforderlich.** Falls Persistence implementiert wird, ist ein separater I12-Store zu bevorzugen.

## Technische Grundlage

Ein `CryptoKey` ist über den Structured-Clone-Mechanismus serialisierbar und kann deshalb grundsätzlich in IndexedDB persistiert werden. Ein nicht extrahierbarer Schlüssel bleibt dabei für `SubtleCrypto.exportKey()`/Wrapping gesperrt. Das ermöglicht lokale Wiederverwendung desselben privaten Schlüssels, ohne ihn als exportierbare Schlüsselbytes in einen JSON-Vertrag umzuwandeln.

Die Persistenzentscheidung darf daraus jedoch keine plattformübergreifende Recovery-Garantie ableiten. Origin-Speicher kann verloren gehen, gelöscht werden oder außerhalb des Anwendungsprotokolls nicht verfügbar sein.

## Zielarchitektur für eine spätere Implementierung

### Separater I12-Store

Bevorzugt wird ein eigener I12-Persistenzbereich statt einer stillen Erweiterung des eingefrorenen I08-Event-Stores.

Fachlich getrennte Verantwortungen:

- aktiver privater `CryptoKey` + zugehöriger `key_id`,
- historisch bekannte Public Keys,
- detached Signature Records,
- optional lokal gecachte Checkpoint-Metadaten.

Diese Daten dürfen den autoritativen I08-Eventstrom nicht verändern.

### No-clobber

- vorhandener aktiver privater Schlüssel wird niemals automatisch überschrieben,
- Schlüsselerzeugung bei bereits vorhandenem Schlüssel muss fail-closed oder explizit als Rotation behandelt werden,
- Import eines bereits bekannten `key_id` darf widersprüchliche Public-Key-Bytes nicht ersetzen,
- Signaturen für denselben fachlichen Bezug dürfen nicht still überschrieben werden.

## Lifecycle

### Erster Schlüssel

Ein privater Schlüssel darf nur erzeugt werden, wenn kein aktiver Schlüssel existiert oder eine explizite Rotation angefordert wurde.

### Neustart

Nach Neustart wird derselbe gespeicherte `CryptoKey` wieder geladen. Fehlt er unerwartet, darf die Anwendung **keinen** Ersatzschlüssel erzeugen und so tun, als sei nichts passiert.

### Lost Key

Bei Schlüsselverlust:

- neuer Signiervorgang mit dem verlorenen `key_id` ist unmöglich,
- bestehende Signaturen bleiben unverändert,
- bekannte Public Keys bleiben zur historischen Verifikation erhalten,
- ein neuer Schlüssel benötigt einen expliziten Rotations-/Rebind-Schritt,
- Actor-Vertrauen muss für den neuen `key_id` neu bewertet werden.

### Rotation

Rotation:

- erzeugt einen neuen Schlüssel und neuen `key_id`,
- wechselt den aktiven Schlüssel nur explizit,
- löscht alte Public Keys und Signaturen nicht,
- behauptet keine Kontinuität des Actor-Vertrauens ohne separaten Trust-Nachweis.

## Backup / Restore

### I10 v1

**Kein REOPEN.**

`ssi-world-backup` v1 bleibt auf autoritative I06-Events beschränkt. Es erhält weder private Schlüssel noch detached Signatures noch I12-Key-Metadaten.

### I12 Authenticity Export

Falls später benötigt, muss Portabilität separat versioniert werden. Ein solches Format darf nur öffentliche/verteilbare Authentizitätsdaten enthalten.

### Private-Key Backup

Für I12 v1: **nicht implementieren** und nicht implizit versprechen.

Ein nicht extrahierbarer privater Schlüssel darf nicht durch einen Workaround in exportierbare Bytes verwandelt werden. Eine spätere Recovery-Strategie würde einen eigenen Security-/Threat-Model-Decision-Gate benötigen.

## Trusted Checkpoint

Ein lokal gespeicherter Checkpoint in demselben Origin-Speicher ist **kein ausreichender externer Vertrauensanker** gegen einen gemeinsamen lokalen Rollback. Für die Aussage "kein Suffix-Rollback" muss der erwartete Checkpoint weiterhin aus einer unabhängigen vertrauenswürdigen Quelle stammen oder explizit außerhalb des zu prüfenden lokalen Event-/Signature-Sets verankert sein.

## REOPEN-Entscheid

### I12

**Explizit REOPENED – Decision-only.**

Grund: Jede neue I12-C-Dokumentation verändert den governed Repository-Fingerprint und macht den vorherigen Frozen-I12-Fingerprint absichtlich historisch. Dieser REOPEN erlaubt ausschließlich diese Decision-Gate-Dokumentation und die dazu notwendige Evidence-Neubindung.

### I08

**Kein REOPEN.**

Der Event Store bleibt unverändert.

### I10

**Kein REOPEN.**

World Backup/Restore v1 bleibt unverändert.

## Non-Goals dieses Decision Gates

- kein neuer IndexedDB-Store,
- keine DB-Versionserhöhung,
- keine Migration,
- keine KeyStore-API,
- kein Signature-Store,
- keine Rotation-Implementierung,
- kein Recovery-Flow,
- kein Backup-Schema-Patch,
- kein I08-/I10-Codepatch,
- keine UI-/Produktlogikänderung.

## Restrisiko

Die Entscheidung legt den benötigten Lifecycle fest, beweist aber noch nicht die Browser-Persistenz eines nicht extrahierbaren Ed25519-`CryptoKey` über echten Close/Reopen hinweg. Vor einer Produktimplementierung muss deshalb ein **isolierter Chromium-Persistence-Proof** mit separatem Test-Store zeigen:

- non-extractable Key speichern,
- Datenbank schließen,
- neu öffnen,
- denselben Key laden,
- damit signieren/verifizieren,
- no-clobber prüfen,
- Verlust-/fehlender-Key-Pfad fail-closed prüfen.

Erst bei grünem Proof darf ein produktiver I12-Persistence-Adapter geplant werden.

## Nächster Schritt

Nach grünen Dokumentations-/Governance-Gates ausschließlich den isolierten **Chromium CryptoKey Persistence Proof** als Testinfrastruktur auflösen. Noch kein produktiver Store.
