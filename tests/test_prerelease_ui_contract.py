"""Statische Schutzpruefungen fuer den unabhaengigen Vorrelease-Browsertest.

Diese Tests ersetzen keinen echten Chromium-Lauf.
"""
from pathlib import Path
import json
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PrereleaseUiContractTests(unittest.TestCase):
    def test_browser_test_is_syntax_checked_by_node_when_available(self):
        import shutil
        import subprocess
        node = shutil.which("node")
        if node is None:
            self.skipTest("Node fehlt; Chromium-Lauf bleibt separat erforderlich")
        result = subprocess.run(
            [node, "--check", str(ROOT / "tests/prerelease_ui_smoke.mjs")],
            capture_output=True, text=True, check=False, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_browser_script_covers_required_viewports_and_input(self):
        script = (ROOT / "tests/prerelease_ui_smoke.mjs").read_text(encoding="utf-8")
        for marker in ("[[800,600],[400,300]]", "Input.dispatchKeyEvent",
                       "Horizontales Scrollen", "Fokus nicht sichtbar",
                       "Enter-Aktivierung", "Read-only-Schutz"):
            with self.subTest(marker=marker):
                self.assertIn(marker, script)

    def test_runtime_keeps_actions_disabled(self):
        source = (ROOT / "app/ui/app.js").read_text(encoding="utf-8")
        self.assertIn('button.disabled = true', source)
        self.assertIn('section.dataset.regressionSurface = "game-shell"', source)
        self.assertIn('panel.hidden = !selected', source)

    def test_css_has_small_viewport_fallback_and_focus_indicator(self):
        css = (ROOT / "app/ui/styles.css").read_text(encoding="utf-8")
        self.assertIn("@media (max-width: 42rem)", css)
        self.assertIn(".ssi-game-grid { grid-template-columns: 1fr; }", css)
        self.assertIn(":focus-visible", css)
        self.assertIn("outline:", css)

    def test_no_unverified_ui_gate_is_marked_pass(self):
        matrix = json.loads((ROOT / "docs/prerelease_matrix.json").read_text(encoding="utf-8"))
        rows = {item["id"]: item for item in matrix["items"]}
        for ident in ("UX-02", "A11Y-01", "AUTO-03"):
            with self.subTest(id=ident):
                self.assertNotEqual(rows[ident]["status"], "PASS")
        self.assertFalse(matrix["technical_ready"])
        self.assertFalse(matrix["release_ready"])


if __name__ == "__main__":
    unittest.main()
