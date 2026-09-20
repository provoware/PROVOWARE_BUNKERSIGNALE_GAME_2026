# I11 – Hash Chain

## Zweck

I11 ergänzt den autoritativen I08-Eventstrom um einen deterministisch prüfbaren Integritätsnachweis. Der Eventlog bleibt die fachliche Wahrheit; die Hashkette ist ein abgeleiteter Integritätsvertrag und erzeugt keinen zweiten Spielzustand.

## Verbindlicher Scope

1. Events werden ausschließlich in der bereits festgelegten deterministischen Welt-Reihenfolge verarbeitet.
2. Jedes Kettenglied bindet den Hash des Vorgängers und die kanonischen Bytes des vollständigen I06-Event-Envelopes.
3. Hashalgorithmus für I11 ist SHA-256; Hexdarstellung ist kleingeschrieben und exakt 64 Zeichen lang.
4. Der Genesis-Vorgänger ist exakt 64-mal `0`.
5. Die Eingabe in SHA-256 wird eindeutig gerahmt, damit Vorgängerhash und Eventbytes nicht mehrdeutig verkettet werden können.
6. Verifikation läuft fail-closed: fehlendes, zusätzliches, umgeordnetes oder verändertes Event sowie ein manipuliertes Kettenglied macht die Kette ungültig.
7. I06-Event-Envelopes werden nicht erweitert oder still verändert. I11 wird zunächst als separater, deterministisch ableitbarer Integritätsvertrag aufgebaut.
8. I08 Event Store, I09 Snapshot Cache und I10 Backup/Restore bleiben gefroren, bis ein späterer I11-Schritt einen tatsächlich notwendigen REOPEN nachweist.

## Architektur

- **Application:** orchestriert Kettenaufbau und Verifikation über injizierte Funktionen für kanonische Eventbytes und SHA-256.
- **Infrastructure:** darf die konkrete Browser-SHA-256-Fähigkeit bereitstellen; Browserfehler werden an der Schichtgrenze stabil übersetzt.
- **UI:** zeigt später ausschließlich einen abgeleiteten Integritätsstatus und verändert weder Events noch Hashkette.
- **Domain:** erhält keine Browser-/Crypto-Abhängigkeit.

Damit bleibt die bestehende Abhängigkeitsrichtung erhalten und I11 zwingt keine Änderung an gefrorenen I06/I08-Verträgen.

## Kettenvertrag v1

Ein Kettenglied enthält mindestens:

- `sequence`
- `event_id`
- `previous_hash`
- `event_hash`

Die Hash-Eingabe besteht aus einer versionierten ASCII-Domänentrennung, dem 64-stelligen Vorgängerhash und den kanonischen UTF-8-Bytes des vollständigen Events. Die konkrete Byte-Rahmung wird vor dem ersten Runtime-Patch in Tests festgeschrieben und darf danach nicht implizit geändert werden.

## Non-Goals

- keine Signaturen, Schlüsselverwaltung oder Autorenauthentisierung (I12),
- keine Änderung des I06-Event-Envelopes,
- keine Mutation bestehender I08-Events,
- kein Snapshot als Integritätsquelle,
- kein automatischer Repair eines beschädigten Eventlogs,
- keine Netzwerk-/Servervalidierung,
- keine Gameplay- oder Contentlogik,
- kein I13-Recovery- oder I14-Multi-Tab-Scope.

## Umsetzungsreihenfolge

### I11-A – Contract + deterministic core

- Byte-Rahmung als Testvektor einfrieren,
- Kettenaufbau aus kanonischen Eventbytes,
- vollständige Verifikation inklusive Genesis und Reihenfolge,
- leere Welt deterministisch behandeln,
- kein Persistenzumbau.

### I11-B – Browser SHA-256 adapter + integration

Erst nach grünem I11-A:

- SHA-256-Adapter über vorhandene Browserfähigkeit,
- stabile Fehlerübersetzung,
- Chromium-Smoke mit Manipulations- und Reihenfolgen-Negativfällen,
- Performanceprofil für 1000 Events.

### I11-C – persistence/recovery decision gate

Erst nach grünem I11-B wird entschieden, ob die Hashkette nur on-demand abgeleitet oder zusätzlich persistiert werden muss. Jede dafür nötige Änderung an I08/I10 verlangt vor dem Patch einen expliziten REOPEN mit Auswirkungsanalyse.

## Exit-Gates I11

I11 darf nur eingefroren werden, wenn:

1. identische Eventbytes dieselbe Kette erzeugen,
2. Genesis und Byte-Rahmung durch feste Testvektoren gebunden sind,
3. Änderung eines Eventbytes die Verifikation zuverlässig scheitern lässt,
4. Löschen, Einfügen oder Umordnen eines Events erkannt wird,
5. Manipulation von `previous_hash` oder `event_hash` erkannt wird,
6. leere Welt deterministisch und ohne Sonderzustandsdrift behandelt wird,
7. 1000 Events im dokumentierten Browserbudget bleiben,
8. allgemeiner Repository-Quality- und Chromium-Smoke grün bleiben,
9. I06/I08/I09/I10 ohne begründeten REOPEN unverändert bleiben,
10. finaler Diff keine I12+-Funktion vorzieht.

## Freeze-Regel

I11-Evidence und Status werden erst nach vollständig grünen finalen Gates an den governeden Repository-Fingerprint gebunden. Bis dahin bleibt I11 offen und I12 gesperrt.
