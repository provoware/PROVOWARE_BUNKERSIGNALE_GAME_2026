from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
STORE = ROOT / "app/infrastructure/browser/indexeddb-event-store.js"
SMOKE = ROOT / ".github/workflows/i08-indexeddb-smoke.yml"


class I08IndexedDbEventStoreTests(unittest.TestCase):
    def test_store_uses_storage_record_without_changing_event_envelope(self) -> None:
        source = STORE.read_text(encoding="utf-8")
        for marker in (
            'async function append(worldId, events)',
            'world_id: worldId',
            'event: clonedEvent',
            'createIndex("by_world"',
            'createIndex("by_world_lamport"',
            'return records.map(record => structuredClone(record.event))',
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)

    def test_store_aborts_synchronous_queue_failures(self) -> None:
        source = STORE.read_text(encoding="utf-8")
        self.assertIn("transaction.abort()", source)
        self.assertIn("try { await done; } catch {}", source)

    def test_store_does_not_implement_i09_snapshot_scope(self) -> None:
        source = STORE.read_text(encoding="utf-8").lower()
        self.assertNotIn("snapshot", source)

    def test_real_browser_gate_covers_abort_duplicate_queue_failure_and_reopen(self) -> None:
        source = SMOKE.read_text(encoding="utf-8")
        for marker in (
            "transaction.abort()",
            "aborted transaction leaked a partial write",
            "duplicate append was accepted",
            "sync queue failure committed a partial event",
            "reopen/readback mismatch",
            "metadata:{}",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)


if __name__ == "__main__":
    unittest.main()
