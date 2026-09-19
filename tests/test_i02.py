from __future__ import annotations

from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from schema_registry import SchemaRegistry, SchemaRegistryError
from ssi_common import read_json


class I02SchemaRegistryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.registry = SchemaRegistry(ROOT)

    def test_registry_audit_and_self_validation(self) -> None:
        self.registry.audit()
        self.registry.validate("schema-registry", "1.0.0", self.registry.data)

    def test_exact_version_resolves_local_schema(self) -> None:
        schema = self.registry.resolve("project-manifest", "1.0.0")
        self.assertEqual(schema["$id"], "https://sound-system-iker.local/schema/project-manifest/1.0.0")

    def test_alias_and_unknown_version_are_rejected(self) -> None:
        for version in ("latest", "^1.0.0", "2.0.0"):
            with self.subTest(version=version), self.assertRaises(SchemaRegistryError) as raised:
                self.registry.resolve("project-manifest", version)
            self.assertEqual(raised.exception.code, "SSI-SCHEMA-0002")

    def test_lifecycle_enforcement(self) -> None:
        entry = self.registry._entries[("project-manifest", "1.0.0")]
        entry["status"] = "deprecated"
        with self.assertRaises(SchemaRegistryError) as raised:
            self.registry.resolve("project-manifest", "1.0.0")
        self.assertEqual(raised.exception.code, "SSI-SCHEMA-0003")
        self.registry.resolve("project-manifest", "1.0.0", allow_deprecated=True)
        entry["status"] = "retired"
        with self.assertRaises(SchemaRegistryError):
            self.registry.resolve("project-manifest", "1.0.0", allow_deprecated=True)

    def test_positive_fixture_validates(self) -> None:
        fixture = read_json(ROOT / "tests/fixtures/schema/positive/project-manifest.json")
        self.registry.validate("project-manifest", "1.0.0", fixture)

    def test_every_negative_fixture_is_rejected_for_declared_reason(self) -> None:
        fixtures = sorted((ROOT / "tests/fixtures/schema/negative").glob("*.json"))
        self.assertGreaterEqual(len(fixtures), 3)
        for path in fixtures:
            fixture = read_json(path)
            with self.subTest(path=path.name), self.assertRaises(SchemaRegistryError) as raised:
                self.registry.validate(fixture["schema"], fixture["version"], fixture["instance"])
            self.assertEqual(raised.exception.code, fixture["expected_code"])


if __name__ == "__main__":
    unittest.main()
