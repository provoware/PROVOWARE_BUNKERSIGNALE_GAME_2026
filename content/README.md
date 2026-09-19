# content/

Reservierter Bereich für versionierte Story-, Dialog-, Gerücht-, Graffiti- und andere Inhaltsdaten.

I04 ergänzt die Registry um eine lokale Inbox mit Prüfung, Quarantäne und atomarer Aktivierung. **Produktive Story-/Spielinhalte sind weiterhin nicht enthalten.**

Regeln:

- keine ausführbare Spiellogik in Content-Dateien,
- stabile IDs statt kopierter Textabhängigkeiten,
- Registry und Lockfile pinnen Pakete exakt; die Inbox darf nur passende Kandidaten aktivieren,
- keine stillen Änderungen an bereits referenzierten Inhalten,
- Tests und Fixtures gehören nach `tests/`, nicht hierher.

Der jeweils zulässige erste Schreib-Checkpoint wird in `manifests/repository.layout.json` festgelegt.
