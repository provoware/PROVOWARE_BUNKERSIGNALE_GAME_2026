from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
RESTORE = ROOT / "app/application/world-restore.js"


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


if __name__ == "__main__":
    unittest.main()
