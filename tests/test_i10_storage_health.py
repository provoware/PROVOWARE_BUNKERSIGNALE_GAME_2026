from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
INFRA = ROOT / "app/infrastructure/browser/storage-health.js"
APP = ROOT / "app/application/storage-health.js"
BOOT = ROOT / "app/bootstrap/main.js"
UI = ROOT / "app/ui/app.js"
CSS = ROOT / "app/ui/styles.css"
GAME = ROOT / "app/application/game-shell.js"


class I10StorageHealthTests(unittest.TestCase):
    def test_infrastructure_is_read_only(self) -> None:
        source = INFRA.read_text(encoding="utf-8")
        self.assertIn('storageManager.estimate()', source)
        self.assertIn('storageManager.persisted()', source)
        self.assertNotIn('storageManager.persist()', source)
        self.assertNotIn('indexedDB', source)
        self.assertNotIn('localStorage', source)

    def test_threshold_contract_is_exact(self) -> None:
        source = APP.read_text(encoding="utf-8")
        self.assertIn('STORAGE_WARNING_RATIO = 0.75', source)
        self.assertIn('STORAGE_CRITICAL_RATIO = 0.90', source)
        self.assertIn('usageRatio >= STORAGE_CRITICAL_RATIO', source)
        self.assertIn('usageRatio >= STORAGE_WARNING_RATIO', source)

    def test_persistence_is_separate_from_capacity(self) -> None:
        source = APP.read_text(encoding="utf-8")
        self.assertIn('persistence_status', source)
        self.assertIn('capacity_status', source)
        self.assertIn('"best_effort"', source)
        self.assertIn('"persistent"', source)
        infra = INFRA.read_text(encoding="utf-8")
        self.assertIn("const persistence = await readPersisted(storageManager);", infra)
        self.assertIn("persisted: persistence.persisted", infra)

    def test_boot_composes_storage_health_without_touching_game_model(self) -> None:
        source = BOOT.read_text(encoding="utf-8")
        self.assertIn('readBrowserStorageHealth()', source)
        self.assertIn('classifyStorageHealth(storageSample)', source)
        game = GAME.read_text(encoding="utf-8")
        for forbidden in ("navigator.storage", "quota", "estimate()", "persisted()"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, game)

    def test_diagnostics_exposes_storage_health_and_meter(self) -> None:
        ui = UI.read_text(encoding="utf-8")
        css = CSS.read_text(encoding="utf-8")
        for marker in (
            'text: "Storage Health"',
            'className: "ssi-storage-meter"',
            'aria-label", "Geschätzte Speicherbelegung"',
            'Browser-Schätzung für diesen Ursprung',
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, ui)
        self.assertIn('.ssi-storage-meter', css)
        self.assertIn('accent-color:', css)


if __name__ == "__main__":
    unittest.main()
