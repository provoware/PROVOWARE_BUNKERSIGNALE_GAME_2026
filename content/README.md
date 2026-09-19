# content/

Reservierter Bereich für versionierte Story-, Dialog-, Gerücht-, Graffiti- und andere Inhaltsdaten.

I03 stellt jetzt Registry, Lockfile und read-only Auflösung bereit. **Produktive Story-/Spielinhalte werden weiterhin nicht aktiviert.**

Regeln:

- keine ausführbare Spiellogik in Content-Dateien,
- stabile IDs statt kopierter Textabhängigkeiten,
- Registry und Lockfile pinnen Pakete exakt; Aktivierung folgt erst in I04 über Inbox/Quarantäne,
- keine stillen Änderungen an bereits referenzierten Inhalten,
- Tests und Fixtures gehören nach `tests/`, nicht hierher.

Der jeweils zulässige erste Schreib-Checkpoint wird in `manifests/repository.layout.json` festgelegt.
