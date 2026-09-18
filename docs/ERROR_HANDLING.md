# Fehlerhandling

## Ziele
Fehler müssen erkennbar, klassifizierbar, diagnostizierbar und sicher behandelbar sein. Stilles Scheitern ist verboten.

## Fehlerobjekt
Jeder strukturierte Fehler besitzt mindestens:
- `code`: stabiler Fehlercode.
- `severity`: INFO, WARNING, ERROR oder FATAL.
- `user_message`: verständliche Handlungsempfehlung ohne interne Details.
- `technical_message`: präzise Diagnose für Evidence und Entwickler.
- `recoverable`: boolescher Wert.
- `context`: nicht-sensitive Schlüsselwerte.
- `cause_code`: optionaler interner Ursprungscode, wenn Fehler übersetzt wurde.

## Domänen
- `ENV`: Laufzeit/Toolchain.
- `VAL`: Validierung.
- `ARCH`: Architekturgrenze.
- `INT`: Integrität/Fingerprint.
- `IO`: Datei- oder Speicheroperation.
- `COMP`: Kompatibilität/Version.
- `REG`: Regression.
- `SEC`: Security-Grenze.
- `INTL`: unerwarteter interner Fehler.

## Exit-Codes der I00-Tools
- 0: Erfolg.
- 2: Validierungsfehler.
- 3: Architekturverletzung.
- 4: Integritätsfehler.
- 5: Umgebungsfehler.
- 6: Regressionstest fehlgeschlagen.
- 70: unerwarteter interner Fehler.

## Fail-Safe
Bei einem Fehler wird niemals ein grüner Status geschrieben. Evidence darf den Fehler dokumentieren, aber ein letzter gefreezter Baseline-Fingerprint wird nicht überschrieben.

## Nutzerführung
Fehlerausgaben nennen, was fehlgeschlagen ist, ob Daten gefährdet sind, was als nächstes sicher getan werden kann und wo die technische Evidence liegt.
