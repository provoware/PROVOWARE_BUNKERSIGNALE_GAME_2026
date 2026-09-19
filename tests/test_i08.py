from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
STORE = ROOT / "app/infrastructure/browser/indexeddb-event-store.js"
SMOKE = ROOT / ".github/workflows/i08-indexeddb-smoke.yml"


class I08IndexedDbEventStoreTests(unittest.TestCase):
    def test_store_has_transactional_append_indices_and_readback(self) -> None:
        source = STORE.read_text(encoding="utf-8")
        for marker in (
            'db.transaction(STORE, "readwrite")',
            'store.add(structuredClone(event))',
            'createIndex("by_world"',
            'createIndex("by_world_lamport"',
            'db.transaction(STORE, "readonly")',
            'index.getAll(range)',
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)

    def test_store_does_not_implement_i09_snapshot_scope(self) -> None:
        source = STORE.read_text(encoding="utf-8").lower()
        self.assertNotIn("snapshot", source)

    def test_real_browser_gate_covers_abort_duplicate_and_reopen(self) -> None:
        source = SMOKE.read_text(encoding="utf-8")
        for marker in (
            "transaction.abort()",
            "aborted transaction leaked a partial write",
            "duplicate append was accepted",
            "reopen/readback mismatch",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)


if __name__ == "__main__":
    unittest.main()
