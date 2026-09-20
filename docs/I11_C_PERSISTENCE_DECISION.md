# I11-C – Persistence / Recovery Decision

## Entscheidung

**I11 bleibt on-demand ableitbar. Die Hashkette wird nicht zusätzlich persistiert.**

Der autoritative I08-Eventstrom enthält bereits alle vollständigen I06-Event-Envelopes in deterministischer Welt-Reihenfolge. I11-A baut daraus deterministisch die Hashkette; I11-B hat denselben Pfad mit Browser-SHA-256 für 1000 Events, Manipulation und Umordnung validiert. Ein zweiter persistierter Hashkettenzustand würde daher keine neue fachliche Wahrheit liefern.

## Evidence

- I08 `readWorld(worldId)` liefert unveränderte Event-Envelopes geordnet über den Welt-/Lamport-/Event-ID-Index.
- I09 ist ausdrücklich nur ein verwerfbarer Cache; Fehler führen zum vollständigen Replay aus dem Eventlog.
- I10 exportiert ausschließlich autoritative Events und stellt sie atomar wieder her; I09-Snapshots und I11-Hashketten sind absichtlich kein Bestandteil von Backup v1.
- I11-A definiert Hashkette und Genesis vollständig als deterministische Funktion der kanonischen Eventbytes.
- I11-B Chromium-Evidence: 1000 Events wurden in 70 ms aufgebaut; Manipulation und Umordnung wurden fail-closed erkannt.

## REOPEN-Entscheid

**Kein I08-, I09- oder I10-REOPEN erforderlich.**

Eine Persistenzänderung würde zusätzliche Synchronisations-, Migrations-, Restore- und Datenverlustpfade erzeugen, ohne für den aktuellen I11-Vertrag einen nachgewiesenen Nutzen zu liefern. Die bestehende Trennung bleibt deshalb erhalten:

`I08 Eventlog → kanonische Eventbytes → I11 Hashkette (on-demand)`

## Recovery-Verhalten

Nach Neustart oder Restore wird die Hashkette bei Bedarf erneut aus dem autoritativen Eventstrom berechnet. Ein Snapshot darf die Integritätsprüfung nicht ersetzen. Fehlt der Eventstrom oder ist seine Reihenfolge/sein Inhalt manipuliert, muss die I11-Verifikation weiterhin fail-closed reagieren.

## Non-Goals

- keine neue IndexedDB-Struktur,
- keine Event-Envelope-Erweiterung,
- keine Backup-v1-Änderung,
- keine Snapshot-Aufwertung zur Integritätsquelle,
- keine Signaturen/Schlüssel aus I12,
- noch kein I11-Freeze-Evidence-Patch.

## Restrisiko

On-demand-Verifikation kostet Rechenzeit proportional zur Eventanzahl. Das aktuelle reale Chromium-Profil von 70 ms für 1000 Events zeigt für den derzeit geprüften Umfang keinen Persistenzbedarf. Bei später nachgewiesener Größen-/Latenzgrenze ist ein neuer, separat begründeter Decision-Gate nötig; daraus darf nicht rückwirkend eine zweite Wahrheit entstehen.

## Nächster Schritt

Nach grünen Dokumentations-/Regression-Gates I11 final gegen alle Exit-Gates prüfen und erst dann Evidence/Status an den governeden Repository-Fingerprint binden. I12 bleibt bis zum I11-Freeze gesperrt.
