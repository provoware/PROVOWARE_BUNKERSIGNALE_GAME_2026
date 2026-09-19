# content/

Reservierter Bereich für versionierte Story-, Dialog-, Gerücht-, Graffiti- und andere Inhaltsdaten.

I04 ergänzt die Registry um eine geprüfte lokale Inbox, Quarantäne und atomare Aktivierung. **Produktive Story-/Spielinhalte sind weiterhin nicht enthalten.**

Regeln:

- keine ausführbare Spiellogik in Content-Dateien,
- stabile IDs statt kopierter Textabhängigkeiten,
- Registry und Lockfile pinnen Pakete exakt; die Inbox aktiviert nur passende Kandidaten in noch freie Ziele,
- keine stillen Änderungen an bereits referenzierten Inhalten,
- Tests und Fixtures gehören nach `tests/`, nicht hierher.

Der jeweils zulässige erste Schreib-Checkpoint wird in `manifests/repository.layout.json` festgelegt.
