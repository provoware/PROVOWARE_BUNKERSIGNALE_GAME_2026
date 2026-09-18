from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from ssi_common import architecture_violations, read_json

RUNTIME_FILES = [
    "index.html",
    "app/bootstrap/main.js",
    "app/application/health.js",
    "app/infrastructure/browser/capabilities.js",
    "app/infrastructure/runtime/build-info.js",
    "app/ui/app.js",
    "app/ui/styles.css",
]

class IndexParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.lang = None
        self.has_main = False
        self.has_noscript = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "html":
            self.lang = values.get("lang")
        elif tag == "main" and values.get("id") == "app":
            self.has_main = True
        elif tag == "noscript":
            self.has_noscript = True

class I01ShellTests(unittest.TestCase):
    def test_runtime_files_exist(self) -> None:
        self.assertEqual([path for path in RUNTIME_FILES if not (ROOT / path).is_file()], [])

    def test_index_has_accessible_boot_surface(self) -> None:
        parser = IndexParser()
        parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
        self.assertEqual(parser.lang, "de")
        self.assertTrue(parser.has_main)
        self.assertTrue(parser.has_noscript)

    def test_boot_has_safe_failure_path(self) -> None:
        text = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("SSI-INTL-0001", text)
        self.assertIn("Deine vorhandenen Daten wurden dabei nicht verändert", text)

    def test_application_health_is_infrastructure_independent(self) -> None:
        text = (ROOT / "app/application/health.js").read_text(encoding="utf-8")
        for forbidden in ("window.", "document.", "navigator.", "indexedDB", "localStorage"):
            self.assertNotIn(forbidden, text)

    def test_feature_detection_does_not_use_user_agent(self) -> None:
        text = (ROOT / "app/infrastructure/browser/capabilities.js").read_text(encoding="utf-8")
        self.assertNotIn("userAgent", text)
        self.assertNotIn("user-agent", text.lower())

    def test_runtime_has_no_external_dependency_urls(self) -> None:
        for rel in RUNTIME_FILES:
            text = (ROOT / rel).read_text(encoding="utf-8")
            self.assertNotIn("https://", text, rel)
            self.assertNotIn("http://", text, rel)

    def test_accessibility_css_guards_exist(self) -> None:
        css = (ROOT / "app/ui/styles.css").read_text(encoding="utf-8")
        self.assertIn(":focus-visible", css)
        self.assertIn("prefers-reduced-motion", css)
        self.assertIn("--ssi-", css)

    def test_architecture_boundaries_stay_green(self) -> None:
        policy = read_json(ROOT / "manifests/architecture.boundaries.json")
        self.assertEqual(architecture_violations(ROOT, policy), [])

if __name__ == "__main__":
    unittest.main()
