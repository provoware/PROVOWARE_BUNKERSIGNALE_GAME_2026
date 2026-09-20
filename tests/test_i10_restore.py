from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
RESTORE = ROOT / "app/application/world-restore.js"
INFRA = ROOT / "app/infrastructure/browser/indexeddb-world-restore.js"
EVENT_STORE = ROOT / "app/infrastructure/browser/indexeddb-event-store.js"


class I10RestoreTests(unittest.TestCase):
    def test_restore_validates_before_atomic_write_capability(self) -> None:
        source = RESTORE.read_text(encoding="utf-8")
        validate_at = source.index("validateWorldBackup(backup)")
        compatibility_at = source.index("backup.content_lock_fingerprint !== contentLockFingerprint")
        write_at = source.index("await restoreIfEmpty(backup.world_id, backup.events)")
        self.assertLess(validate_at, compatibility_at)
        self.assertLess(compatibility_at, write_at)

    def test_restore_requires_atomic_no_clobber_capability(self) -> None:
        source = RESTORE.read_text(encoding="utf-8")
        self.assertIn('typeof restoreIfEmpty !== "function"', source)
        self.assertNotIn("append(", source)
        self.assertNotIn("readWorld(", source)

    def test_invalid_json_is_fail_closed(self) -> None:
        source = RESTORE.read_text(encoding="utf-8")
        self.assertIn('throw new TypeError("backup JSON is invalid")', source)

    def test_atomic_infrastructure_checks_empty_and_writes_in_one_transaction(self) -> None:
        source = INFRA.read_text(encoding="utf-8")
        transaction_at = source.index('db.transaction(STORE, "readwrite")')
        count_at = source.index('store.index(WORLD_INDEX).count')
        add_at = source.index("store.add({")
        self.assertLess(transaction_at, count_at)
        self.assertLess(count_at, add_at)
        self.assertIn('"SSI-RESTORE-2001"', source)
        self.assertIn('"SSI-RESTORE-2002"', source)

    def test_restore_capability_matches_frozen_i08_storage_contract(self) -> None:
        restore_source = INFRA.read_text(encoding="utf-8")
        event_store = EVENT_STORE.read_text(encoding="utf-8")
        for marker in (
            'const DB_VERSION = 1;',
            'const STORE = "events";',
            'store.createIndex("by_world", "world_id", { unique: false });',
            'store.createIndex("by_world_lamport", ["world_id", "lamport", "event_id"], { unique: false });',
            'world_id: worldId',
            'event_id: clonedEvent.event_id',
            'lamport: clonedEvent.lamport',
            'event: clonedEvent',
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, restore_source)
                self.assertIn(marker, event_store)

    def test_restore_infrastructure_has_no_ui_or_i11_dependencies(self) -> None:
        source = INFRA.read_text(encoding="utf-8")
        for forbidden in ("document.", "window.", "localStorage", "sessionStorage", "crypto.subtle", "hashchain", "signature"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, source)


if __name__ == "__main__":
    unittest.main()
