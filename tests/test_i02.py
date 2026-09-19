from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class I02DesignSystemTests(unittest.TestCase):
    def test_required_components_use_shared_styles(self) -> None:
        source = (ROOT / "app/ui/app.js").read_text(encoding="utf-8")
        for component in ("ssi-button", "ssi-panel", "ssi-dialog", "ssi-status", "ssi-toast", "ssi-empty-state"):
            self.assertIn(component, source)

    def test_dialog_and_notification_are_accessible(self) -> None:
        source = (ROOT / "app/ui/app.js").read_text(encoding="utf-8")
        for marker in ('"dialog"', '"aria-labelledby"', '"aria-live"', '"polite"'):
            self.assertIn(marker, source)

    def test_visual_accessibility_guards_exist(self) -> None:
        css = (ROOT / "app/ui/styles.css").read_text(encoding="utf-8")
        for marker in (":focus-visible", "prefers-reduced-motion", "prefers-contrast", "--ssi-space-", "--ssi-shadow"):
            self.assertIn(marker, css)


if __name__ == "__main__":
    unittest.main()
