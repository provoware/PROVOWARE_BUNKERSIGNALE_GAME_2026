from __future__ import annotations

import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from content_registry import ContentRegistry, ContentRegistryError
from ssi_common import read_json


class I03ContentRegistryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = ROOT / "tests/fixtures/content/positive"

    def fixture_registry(self, root: Path) -> ContentRegistry:
        return ContentRegistry(
            root=root,
            registry_path="registry.json",
            lock_path="lock.json",
            fingerprint_path="registry-lock.sha256",
        )

    def copy_fixture(self, target: Path) -> None:
        shutil.copytree(self.fixture, target, dirs_exist_ok=True)

    def write_json(self, path: Path, data: dict) -> None:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

    def test_production_registry_is_read_only_empty_and_fingerprinted(self) -> None:
        registry = ContentRegistry(ROOT)
        self.assertEqual(registry.registry["packages"], [])
        self.assertEqual(registry.lock["entries"], [])
        registry.audit()
        self.assertRegex(registry.audit_fingerprint(), r"^[0-9a-f]{64}$")

    def test_positive_fixture_resolves_deterministically(self) -> None:
        registry = self.fixture_registry(self.fixture)
        registry.audit()
        self.assertEqual(
            registry.resolve_graph("feature.addon", "1.0.0"),
            [("core.base", "1.0.0"), ("feature.addon", "1.0.0")],
        )
        package = registry.resolve("feature.addon", "1.0.0")
        self.assertEqual(package["package_id"], "feature.addon")
        self.assertEqual(
            registry.audit_fingerprint(),
            "8ee5b67dadaf74303eb850046a027dee4df602f31894fa5c8a528d1f5790f264",
        )

    def test_alias_and_unknown_package_are_rejected(self) -> None:
        registry = self.fixture_registry(self.fixture)
        for version in ("latest", "^1.0.0", "2.0.0"):
            with self.subTest(version=version), self.assertRaises(ContentRegistryError) as raised:
                registry.resolve("feature.addon", version)
            self.assertEqual(raised.exception.code, "SSI-CONTENT-0002")

    def test_negative_fixtures_fail_for_declared_reason(self) -> None:
        cases = read_json(ROOT / "tests/fixtures/content/negative/cases.json")["cases"]
        for case in cases:
            with self.subTest(case=case["name"]), tempfile.TemporaryDirectory() as tmp:
                work = Path(tmp) / "fixture"
                self.copy_fixture(work)
                registry_data = read_json(work / "registry.json")
                lock_data = read_json(work / "lock.json")

                mutation = case["mutation"]
                if mutation == "duplicate_package":
                    registry_data["packages"].append(dict(registry_data["packages"][0]))
                    self.write_json(work / "registry.json", registry_data)
                elif mutation == "missing_dependency":
                    registry_data["packages"][1]["dependencies"][0]["package_id"] = "missing.base"
                    self.write_json(work / "registry.json", registry_data)
                elif mutation == "wrong_dependency_version":
                    registry_data["packages"][1]["dependencies"][0]["version"] = "9.9.9"
                    self.write_json(work / "registry.json", registry_data)
                elif mutation == "tampered_lock_hash":
                    lock_data["entries"][1]["sha256"] = "0" * 64
                    self.write_json(work / "lock.json", lock_data)
                elif mutation == "registry_lock_drift":
                    with (work / "registry.json").open("a", encoding="utf-8") as stream:
                        stream.write("\n")

                with self.assertRaises(ContentRegistryError) as raised:
                    registry = self.fixture_registry(work)
                    registry.audit()
                    registry.audit_fingerprint()
                self.assertEqual(raised.exception.code, case["expected_code"])

    def test_failed_resolution_never_mutates_registry_or_lock(self) -> None:
        registry_path = ROOT / "manifests/content.registry.json"
        lock_path = ROOT / "manifests/content.lock.json"
        before = (registry_path.read_bytes(), lock_path.read_bytes())
        registry = ContentRegistry(ROOT)
        with self.assertRaises(ContentRegistryError):
            registry.resolve("missing.package", "1.0.0")
        after = (registry_path.read_bytes(), lock_path.read_bytes())
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
