from pathlib import Path
import json
import unittest

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / "app/application/game-shell.js"
UI = ROOT / "app/ui/app.js"
CSS = ROOT / "app/ui/styles.css"
BOOT = ROOT / "app/bootstrap/main.js"
MANIFEST = ROOT / "manifests/project.manifest.json"


class I10GameUiRegressionShellTests(unittest.TestCase):
    def test_game_shell_is_read_only_application_view_model(self) -> None:
        source = GAME.read_text(encoding="utf-8")
        for forbidden in ("window.", "document.", "navigator.", "indexedDB", "localStorage", "sessionStorage"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, source)
        self.assertIn('mode: "regression_fixture"', source)
        self.assertIn("keine Weltmutation", source)

    def test_boot_composes_game_shell_without_storage_adapter(self) -> None:
        source = BOOT.read_text(encoding="utf-8")
        self.assertIn('createGameShellSnapshot', source)
        self.assertIn('gameShell', source)
        self.assertNotIn("indexeddb-snapshot-cache", source.lower())
        self.assertNotIn("indexeddb-event-store", source.lower())

    def test_ui_exposes_game_panel_and_disabled_actions(self) -> None:
        source = UI.read_text(encoding="utf-8")
        for marker in (
            'text: "Spiel"',
            'section.id = "game-panel"',
            'section.dataset.regressionSurface = "game-shell"',
            'button.disabled = true',
            'text: "Spielansicht · Regression"',
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)

    def test_layout_contract_and_single_visual_accent_exist(self) -> None:
        source = CSS.read_text(encoding="utf-8")
        self.assertIn(".ssi-game-grid", source)
        self.assertIn("grid-template-columns:", source)
        self.assertIn(".ssi-scene-card { border-top: 0.2rem solid var(--ssi-accent);", source)
        self.assertIn("@media (max-width: 42rem)", source)

    def test_i10_is_active_but_storage_export_logic_is_not_started(self) -> None:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(manifest["checkpoint"], "I10")
        self.assertEqual(manifest["status"], "active_i10")
        self.assertEqual(manifest["next_checkpoint"], "I11")
        source = GAME.read_text(encoding="utf-8").lower()
        for forbidden in ("navigator.storage", "showSaveFilePicker".lower(), "quota", "exportworld", "importworld"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, source)


if __name__ == "__main__":
    unittest.main()
