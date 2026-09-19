# content/

Reservierter Bereich für versionierte Story-, Dialog-, Gerücht-, Graffiti- und andere Inhaltsdaten.

I04 ergänzt die Registry um eine geprüfte lokale Inbox, Quarantäne und atomare Aktivierung. I05 ergänzt ausschließlich eine read-only Hot-Swap-Entscheidungsschicht. **Produktive Story-/Spielinhalte sind weiterhin nicht enthalten.**

Regeln:

- keine ausführbare Spiellogik in Content-Dateien,
- stabile IDs statt kopierter Textabhängigkeiten,
- Registry und Lockfile pinnen Pakete exakt; die Inbox aktiviert nur passende Kandidaten in noch freie Ziele,
- Hot-Swap-Klassen entscheiden nur über Zulässigkeit und führen selbst keine Aktivierung aus,
- Textwechsel liegen in der sichersten Klasse; unbekannte Contentarten verlangen mindestens einen kontrollierten Neustart,
- keine stillen Änderungen an bereits referenzierten Inhalten,
- Tests und Fixtures gehören nach `tests/`, nicht hierher.

Der jeweils zulässige erste Schreib-Checkpoint wird in `manifests/repository.layout.json` festgelegt.
