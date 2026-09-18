# Subagenten- und Fachrollenprotokoll

## Ziel
Komplexe Änderungen werden aus mehreren unabhängigen Fachperspektiven geprüft, ohne konkurrierende Wahrheiten oder gleichzeitige unkoordinierte Dateischreibzugriffe zu erzeugen.

## Merge-Hoheit
Nur `orchestrator` darf einen Checkpoint integrieren und freigeben. Fachrollen dürfen Ergebnisse, Patches oder Vetos liefern, aber keine gefreezte Baseline eigenmächtig überschreiben.

## Rollen
1. `orchestrator` - Scope, Reihenfolge, Konfliktauflösung, Merge, Freeze und Evidence.
2. `architecture_guardian` - Schichtgrenzen, State-Owner, Abhängigkeiten, ADR-Pflicht.
3. `data_schema_auditor` - Schemas, IDs, Versionen, Migrationseignung, deterministische Datenverträge.
4. `qa_regression` - Positiv-, Negativ-, Recovery- und Regressionstests.
5. `security_integrity` - Trust Boundaries, Eingabevalidierung, Hash/Signaturpfade, sichere Fehler.
6. `ux_accessibility` - Verständlichkeit, Fehlerzustände, Tastatur/Zoom/Bewegung und WCAG-Ziel.
7. `content_canon` - Kanonstatus, Provenienz, Textentkopplung und Story-Konsistenz.
8. `release_evidence` - Versionierung, Changelog, Fingerprints, Exit-Kriterien und Releasepaket.

## Arbeitsfolge
1. Orchestrator erstellt Change-ID, Scope und betroffene Owner.
2. Architektur und Daten prüfen Verträge vor Implementierung.
3. Implementierung erfolgt in der kleinsten sinnvollen Änderung.
4. QA/Regression und Security prüfen Positiv-, Negativ- und Fehlerwege.
5. UX/Accessibility prüft sichtbare Verhaltensänderungen.
6. Content/Kanon prüft nur Änderungen mit Story- oder Contentwirkung.
7. Release/Evidence prüft Version, Changelog, Fingerprint und Nachweise.
8. Orchestrator integriert nur bei grünen Pflichtrollen.

## Parallelität
Zwei Rollen dürfen nicht gleichzeitig dieselbe Datei als exklusive Schreibfläche beanspruchen. Lesende Prüfungen dürfen parallel stattfinden. Konflikte werden vor Merge aufgelöst und niemals per letzter Schreibzugriff gewinnt.

## Tool-Fallback
Wenn keine echten Subagenten ausführbar sind, MUSS der Orchestrator dieselben Rollen nacheinander als getrennte Review-Pässe ausführen und deren Resultate im Evidence-Report ausweisen. Qualitätsanforderungen ändern sich dadurch nicht.

## Veto
`architecture_guardian`, `qa_regression` und `security_integrity` besitzen für ihre harten Gates ein Veto. Ein Veto kann nur durch Behebung oder eine dokumentierte Scope-Änderung mit REOPEN aufgelöst werden.
