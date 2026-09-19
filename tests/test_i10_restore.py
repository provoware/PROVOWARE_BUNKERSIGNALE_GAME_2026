from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
RESTORE = ROOT / "app/application/world-restore.js"
BACKUP = ROOT / "app/application/world-backup.js"


class I10WorldRestoreTests(unittest.TestCase):
    def test_restore_is_application_only_and_infrastructure_injected(self) -> None:
        source = RESTORE.read_text(encoding="utf-8")
        for forbidden in (
            "indexedDB",
            "localStorage",
            "sessionStorage",
            "navigator.",
            "document.",
            "window.",
            "showOpenFilePicker",
            "showSaveFilePicker",
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, source)
        self.assertIn('requireFunction(readWorld, "readWorld")', source)
        self.assertIn('requireFunction(appendWorld, "appendWorld")', source)
        self.assertIn("await appendWorld(plan.world_id, plan.events)", source)

    def test_preflight_order_is_validate_content_lock_then_no_clobber(self) -> None:
        source = RESTORE.read_text(encoding="utf-8")
        parsed = source.index("const backup = parseBackupText(backupText);")
        content_lock = source.index("backup.content_lock_fingerprint !== expectedContentLockFingerprint")
        read_target = source.index("existing = await readWorld(backup.world_id)")
        append = source.index("await appendWorld(plan.world_id, plan.events)")
        self.assertLess(parsed, content_lock)
        self.assertLess(content_lock, read_target)
        self.assertLess(read_target, append)

    def test_restore_has_stable_fail_closed_error_codes(self) -> None:
        source = RESTORE.read_text(encoding="utf-8")
        for code in (
            "SSI-RESTORE-1001",
            "SSI-RESTORE-1002",
            "SSI-RESTORE-1003",
            "SSI-RESTORE-1004",
            "SSI-RESTORE-1005",
            "SSI-RESTORE-1006",
        ):
            with self.subTest(code=code):
                self.assertIn(code, source)

    def test_restore_reuses_backup_validator_and_canonical_clone(self) -> None:
        source = RESTORE.read_text(encoding="utf-8")
        self.assertIn('import { canonicalJson, validateWorldBackup }', source)
        self.assertIn("validateWorldBackup(backup)", source)
        self.assertIn("JSON.parse(canonicalJson(event))", source)

    def test_restore_does_not_add_i11_or_file_io_scope(self) -> None:
        combined = (RESTORE.read_text(encoding="utf-8") + BACKUP.read_text(encoding="utf-8")).lower()
        for forbidden in ("hashchain", "signature", "cryptosubtle", "showopenfilepicker", "showsavefilepicker"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, combined)


if __name__ == "__main__":
    unittest.main()
