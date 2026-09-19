from __future__ import annotations

import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "app/infrastructure/browser/indexeddb-snapshot-cache.js"
SMOKE = ROOT / ".github/workflows/i09-snapshot-smoke.yml"
PROFILE = ROOT / "tests/fixtures/snapshot/large-world-profile.json"


class I09SnapshotCacheTests(unittest.TestCase):
    def test_cache_is_separate_discardable_infrastructure(self) -> None:
        source = CACHE.read_text(encoding="utf-8")
        for marker in (
            'dbName = "provoware-bunkersignale-snapshots"',
            'const STORE = "snapshots"',
            'async function write(snapshot)',
            'async function readValid(worldId',
            'async function discard(worldId)',
            'async function resolveState(',
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)
        self.assertNotIn("indexeddb-event-store", source.lower())

    def test_invalid_or_stale_snapshot_is_discarded_before_replay(self) -> None:
        source = CACHE.read_text(encoding="utf-8")
        for marker in (
            "record.event_fingerprint === eventFingerprint",
            "record.ruleset_version === rulesetVersion",
            "record.event_count === eventCount",
            "await discard(worldId)",
            'source: "replay"',
            'source: "snapshot"',
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)

    def test_resolve_state_replays_when_cache_storage_rejects(self) -> None:
        source = CACHE.read_text(encoding="utf-8")
        self.assertIn("assertReadRequest(worldId", source)
        self.assertIn("try {", source)
        self.assertIn('snapshot = await readValid(worldId', source)
        self.assertIn("catch {", source)
        self.assertIn("snapshot = null;", source)

    def test_failed_read_settles_transaction_before_replay(self) -> None:
        source = CACHE.read_text(encoding="utf-8")
        self.assertIn('phase: "after-read-queued"', source)
        self.assertIn("record = await requestResult(request)", source)
        self.assertIn("try { await done; } catch {}", source)

    def test_snapshot_write_has_abort_path_and_does_not_enter_i10_scope(self) -> None:
        source = CACHE.read_text(encoding="utf-8")
        self.assertIn("transaction.abort()", source)
        for forbidden in ("navigator.storage", ".estimate(", ".persist(", "exportworld", "importworld"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, source.lower())

    def test_large_world_profile_and_browser_smoke_cover_hardening(self) -> None:
        profile = json.loads(PROFILE.read_text(encoding="utf-8"))
        self.assertEqual(profile["count"], 1000)
        self.assertLessEqual(profile["max_replay_ms"], 5000)

        source = SMOKE.read_text(encoding="utf-8")
        for marker in (
            "missing snapshot did not fall back to full replay",
            "wrong-fingerprint snapshot was not discarded",
            "corrupt snapshot did not fall back to full replay",
            "cache storage failure did not fall back to full replay",
            "async read failure did not fall back cleanly",
            "aborted snapshot write replaced the last valid snapshot",
            "max_cache_read_ms",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)


if __name__ == "__main__":
    unittest.main()
