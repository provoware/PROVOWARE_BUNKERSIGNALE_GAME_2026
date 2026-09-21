# I12-C – P2-LI Sign-Orchestration Integration Decision

## Zweck

Dieser Decision Gate klärt ausschließlich, ob nach grünem P2-L und vor P3 noch ein Integrationsschritt erforderlich ist.

**Entscheidung: Ja.** Vor P3 wird ein eigener **P2-LI Sign-Orchestration Integration Gate** benötigt.

Noch keine Implementierung in diesem Gate.

## Ausgangslage

P2-L ist grün implementiert:

`ensureActiveSigningKeyRegistered(...)`

erzwingt bereits:

`P1 read → public export → key_id derive/verify → P2 putIfAbsent → Erfolg`

Die bestehende Signaturfunktion:

`signEventDetached(...)`

ist jedoch weiterhin separat aufrufbar.

Damit ist die Lifecycle-Barriere korrekt implementiert, aber noch nicht durch einen einzigen freigegebenen Sign-Orchestrierungsweg technisch untrennbar mit dem Signieren verbunden.

## Risiko ohne P2-LI

Würde P3 jetzt eröffnet, könnte ein späterer Signature-Persistence-Pfad versehentlich:

1. direkt `signEventDetached(...)` aufrufen,
2. dabei die P2-L-Registration Barrier umgehen,
3. anschließend eine gültige detached Signatur mit einem `key_id` erzeugen,
4. obwohl dessen Public Key nicht durch den vorgesehenen P2-L-Orchestrierungsweg bestätigt wurde.

Das wäre kein Fehler in P2 oder P2-L selbst, sondern eine offene Integrationslücke zwischen Lifecycle und Signaturerzeugung.

## Entscheidung

Vor P3 MUSS ein minimaler Application-Orchestrator eingefroren und anschließend implementiert werden.

Die verbindliche Reihenfolge lautet:

1. `ensureActiveSigningKeyRegistered(...)`
2. bestätigten `key_id` aus dessen Rückgabewert übernehmen
3. den Signatur-Kontext ausschließlich mit diesem bestätigten `key_id` bilden
4. erst danach `signEventDetached(...)` aufrufen
5. detached Signature Record zurückgeben
6. **keine Persistence in P2-LI**

Der Integrationspfad darf keinen frei von außen gelieferten abweichenden `key_id` akzeptieren.

## Sicherheitsinvariante

Der einzige zukünftig freigegebene produktive Signierweg muss beweisen:

`registration success → confirmed key_id → sign`

Nicht erlaubt:

- `sign → register`
- `sign ohne registration`
- frei übergebener `key_id`, der nicht aus P2-L stammt
- Signature-Persistence innerhalb dieses Gates

## Ownership

P2-LI gehört in die Application-Schicht.

Es darf ausschließlich bestehende Capabilities komponieren:

- P2-L: `ensureActiveSigningKeyRegistered(...)`
- I12-A: `signEventDetached(...)`
- bestehende I11-/Canonical-/SHA-256-Capabilities für den Signaturkontext
- konkrete Ed25519-Sign-Capability über Dependency Injection

Infrastructure, P1, P2, I08, I10 und UI bleiben unverändert.

## Geplanter minimaler Contract

Der folgende Contract Gate muss vor Implementierung mindestens festlegen:

- exakte öffentliche Funktionssignatur;
- welche Context-Felder von außen erlaubt sind;
- dass `key_id` ausschließlich aus P2-L übernommen wird;
- Capability-Injection;
- stabile Fehleroberfläche;
- Rückgabewert;
- Call-Trace:
  `register-barrier → sign`;
- Nachweis, dass Sign bei jedem P2-L-Fehler 0-mal aufgerufen wird;
- Nachweis, dass kein Signature-Persistence-Write stattfindet;
- Contract-Tests und Exit-Gates.

## Non-Goals

- keine Implementierung in diesem Decision Gate;
- keine detached Signature Persistence;
- keine Signature-DB oder Schemaänderung;
- keine Rotation;
- keine Backup-/Restore-Erweiterung;
- keine Actor↔Key-Trust-Persistence;
- keine Trusted-Checkpoint-Persistence;
- keine UI-/CSS-/DOM-Änderung;
- kein I08-/I10-REOPEN.

## Freeze-Grenzen

Byteunverändert bleiben in diesem Decision Gate:

- `app/application/active-key-registration.js`
- `app/application/event-signature.js`
- P1/P2 Infrastructure
- DB-Version und Schemas
- bestehende I12-A/B/P1/P2/P2-L Tests
- I06/I08/I09/I10/I11-Verträge

## Exit-Gates

1. P2-LI als verpflichtender Zwischenblock vor P3 dokumentiert.
2. Direkter Übergang P2-L → P3 ausdrücklich ausgeschlossen.
3. Reihenfolge `registration success → confirmed key_id → sign` verbindlich.
4. freier externer `key_id` für den neuen Sign-Orchestrator verboten.
5. noch keine Signature-Persistence.
6. kein Produkt-, DB-, Schema-, UI- oder Testcode verändert.
7. I08/I10 bleiben geschlossen.
8. P3 bleibt gesperrt.
9. Repository Quality nach Evidence-Neubindung grün.
10. finaler Diff ausschließlich Masterplan/Decision/VW-003/Change Record/Evidence/Status.

## Nächster Schritt

Nach grünem Freeze ausschließlich den **P2-LI Contract Gate – Registered Sign Path** eröffnen.

P3 Detached Signature Persistence bleibt bis zum grünen P2-LI-Implementierungs-Freeze gesperrt.
