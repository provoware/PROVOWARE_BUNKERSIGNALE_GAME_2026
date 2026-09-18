from __future__ import annotations

from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from ssi_common import architecture_violations, read_json, repository_fingerprint, scan_forbidden_markers
from validate_repo import REQUIRED_FILES, validate_agent_registry, validate_schema_headers, validate_versions

class I00Tests(unittest.TestCase):
    def test_required_files_exist(self) -> None:
        missing = [rel for rel in REQUIRED_FILES if not (ROOT / rel).is_file()]
        self.assertEqual(missing, [])

    def test_version_contract(self) -> None:
        self.assertEqual(validate_versions(), [])

    def test_agent_merge_authority(self) -> None:
        self.assertEqual(validate_agent_registry(), [])

    def test_schema_dialect(self) -> None:
        self.assertEqual(validate_schema_headers(), [])

    def test_positive_architecture_fixture_is_allowed(self) -> None:
        policy = read_json(ROOT / "manifests/architecture.boundaries.json")
        fixture = ROOT / "tests/fixtures/architecture/positive"
        self.assertEqual(architecture_violations(fixture, policy), [])

    def test_negative_architecture_fixture_is_rejected(self) -> None:
        policy = read_json(ROOT / "manifests/architecture.boundaries.json")
        fixture = ROOT / "tests/fixtures/architecture/negative"
        violations = architecture_violations(fixture, policy)
        self.assertGreaterEqual(len(violations), 1)
        self.assertTrue(all(v.code == "SSI-ARCH-0001" for v in violations))

    def test_forbidden_marker_detection(self) -> None:
        marker = "TO" + "DO"
        self.assertEqual(scan_forbidden_markers(f"// {marker}: unresolved"), [marker])
        self.assertEqual(scan_forbidden_markers("const ready = true;"), [])

    def test_fingerprint_is_deterministic_for_unchanged_repo(self) -> None:
        first, first_files = repository_fingerprint(ROOT)
        second, second_files = repository_fingerprint(ROOT)
        self.assertEqual(first, second)
        self.assertEqual(first_files, second_files)
        self.assertRegex(first, r"^[0-9a-f]{64}$")

    def test_standards_registry_contains_expected_baseline(self) -> None:
        data = read_json(ROOT / "manifests/standards.registry.json")
        versions = {item["id"]: item["version"] for item in data["standards"]}
        self.assertEqual(versions["semver"], "2.0.0")
        self.assertEqual(versions["conventional_commits"], "1.0.0")
        self.assertEqual(versions["json_schema"], "2020-12")
        self.assertEqual(versions["owasp_asvs"], "5.0.0-reference")

if __name__ == "__main__":
    unittest.main()
