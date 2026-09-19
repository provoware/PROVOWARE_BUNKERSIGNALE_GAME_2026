from __future__ import annotations

from pathlib import Path
import json
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from schema_registry import SchemaRegistry

BACKUP = ROOT / "app/application/world-backup.js"
SCHEMA = ROOT / "schemas/world-backup.schema.json"
REGISTRY = ROOT / "manifests/schema.registry.json"


def event(event_id: str = "event:000000000000000000000001") -> dict:
    return {
        "event_id": event_id,
        "event_type": "test.event",
        "payload": {},
        "author_id": "actor:000000000000000000000001",
        "sequence": 1,
        "lamport": 0,
        "ruleset_version": "1.0.0",
        "metadata": {},
    }


class I10WorldBackupTests(unittest.TestCase):
    def test_world_backup_schema_is_registered_and_validates_top_level_contract(self) -> None:
        registry = SchemaRegistry(ROOT)
        instance = {
            "format": "ssi-world-backup",
            "format_version": 1,
            "world_id": "world:000000000000000000000001",
            "product_version": "0.1.0-alpha.0",
            "content_lock_fingerprint": "a" * 64,
            "event_count": 1,
            "events": [event()],
        }
        registry.validate("world-backup", "1.0.0", instance)
        invalid = json.loads(json.dumps(instance))
        invalid["events"] = [{}]
        with self.assertRaises(Exception):
            registry.validate("world-backup", "1.0.0", invalid)
        entries = json.loads(REGISTRY.read_text(encoding="utf-8"))["entries"]
        self.assertTrue(any(item["name"] == "world-backup" and item["introduced_in"] == "I10" for item in entries))

    def test_schema_is_exact_and_excludes_snapshot_state(self) -> None:
        schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
        self.assertFalse(schema["additionalProperties"])
        self.assertEqual(schema["properties"]["format"]["const"], "ssi-world-backup")
        self.assertEqual(schema["properties"]["format_version"]["const"], 1)
        self.assertNotIn("snapshot", json.dumps(schema).lower())
        self.assertNotIn("exported_at", schema["properties"])

    def test_application_export_is_read_only_and_infrastructure_independent(self) -> None:
        source = BACKUP.read_text(encoding="utf-8")
        for forbidden in (
            "indexedDB",
            "localStorage",
            "sessionStorage",
            "navigator.",
            "document.",
            "window.",
            ".append(",
            "deleteDatabase",
            "restore",
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, source)
        self.assertIn("const events = await readWorld(worldId);", source)
        self.assertIn("serializeWorldBackup", source)
        self.assertIn("canonicalJson", source)

    def test_canonicalizer_preserves_proto_named_json_keys(self) -> None:
        source = BACKUP.read_text(encoding="utf-8")
        self.assertIn("Object.create(null)", source)
        self.assertIn("Object.defineProperty(normalized, key", source)

    def test_runtime_validator_covers_i06_event_invariants(self) -> None:
        source = BACKUP.read_text(encoding="utf-8")
        for marker in (
            "event_id is invalid",
            "author_id is invalid",
            "sequence must be >= 1",
            "lamport must be >= 0",
            "ruleset_version is invalid",
            "event_count does not match events",
            "events are not in deterministic world order",
            "event_id must be unique",
            "event sequence must strictly increase",
            "event lamport must not decrease",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)


if __name__ == "__main__":
    unittest.main()
