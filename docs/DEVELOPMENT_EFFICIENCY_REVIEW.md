# Entwicklungsdisziplin- und Effizienzreview

## Befund

Die Entwicklungsqualitaet ist fachlich hoch: kleine Checkpoint-Schritte, fail-closed Security-Vertraege, explizite Non-Goals, reale Browser-Smokes und reproduzierbare Evidence verhindern stilles Scope-Creep.

Der groesste Effizienzverlust lag nicht im Produktcode, sondern im Prozess:

1. Feature-Branches starteten `quality` sowohl auf `push` als auch erneut auf `pull_request`.
2. Viele Iterationen pushten absichtlich einen roten Stand, nur um danach den governed Fingerprint in Evidence/Status zu binden.
3. `changes/**` loeste I11- und Ed25519-Browser-Smokes aus, obwohl Change Records keinen Krypto-Runtime-Pfad veraendern.
4. Der allgemeine I01-Smoke reagierte auch auf Tests, README, Changelog, Evidence, Status und Schemas.
5. Mehrere Evidence-/Reviewtexte wiederholten unveraenderte Verantwortungsbereiche vollstaendig.
6. Die I12-Masterplanung wiederholt teilweise Detailvertraege, die bereits eigene Decision-/Contract-Dokumente besitzen.

## Bewertung

### Entwicklungsdisziplin

**Staerke:** sehr hoch. Freeze/REOPEN, Non-Goals, kleinste funktionale Bloecke und Security-Barrieren sind konsequent.

**Risiko:** zu viele formale Zwischenzustaende koennen selbst zum Fehlerfaktor werden. Wenn ein 50- bis 100-Zeilen-Produktpatch mehrere hundert Zeilen Governance-Aenderung und mehrere CI-Runden erzeugt, sinkt die Signal-zu-Rauschen-Rate.

### Codesparsamkeit

Der aktuelle Application-Code ist angemessen klein und klar:

- kleine, injizierte Orchestratoren;
- keine unnoetigen Frameworks;
- keine versteckte Persistence in Application;
- keine vorgezogenen Generalisierungen.

Die Tests sind deutlich laenger als der Produktcode. Das ist bei kryptografischen/fail-closed Invarianten akzeptabel, solange explizite Negativfaelle lesbar bleiben. Eine Testabstraktion nur zur Zeilenreduktion waere aktuell eher ein Rueckschritt.

### CI-Effizienz

Hier lag der groesste konkrete Hebel. Governance-Dateien duerfen nur Quality/Governance pruefen; fachfremde Browser-Smokes muessen pfadbasiert entkoppelt sein.

## Neue Zielkennzahlen

Ab diesem Review gelten als Arbeitsziele:

- normaler Branch: **1 fachlicher Write-Batch + hoechstens 1 konkreter Fix-Batch**;
- erster Remote-PR-Head: bereits lokal gruen und Evidence-gebunden;
- Feature-Branch: **kein doppelter Quality-Lauf durch push + pull_request**;
- Governance-only PR: keine I01/I11/I12-Browser-Smokes ohne Runtime-Pfadtreffer;
- unveraenderte Reviewrollen: kurze `UNCHANGED`-Evidence statt Vollwiederholung;
- detaillierter Vertrag: eine Single Source of Truth, Masterplan nur Kurzreferenz;
- keine neue Abstraktion ohne wiederholte reale Nutzung.

## Nicht veraendert

Diese Optimierung lockert keine Sicherheits- oder Produktgates:

- lokale Unit-/Negativtests bleiben vollstaendig;
- PR-Quality bleibt verpflichtend;
- Post-Merge-Quality auf `main` bleibt verpflichtend;
- relevante Browser-Smokes bleiben verpflichtend;
- Freeze/REOPEN bleibt unveraendert;
- Evidence/Fingerprint bleibt verpflichtend;
- I08/I10/I11/I12-Securityvertraege bleiben unveraendert.
