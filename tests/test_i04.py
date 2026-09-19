from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from content_inbox import ContentInbox
from content_registry import ContentRegistry, ContentRegistryError


class I04ContentInboxTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = ROOT / "tests/fixtures/content/positive"
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        shutil.copytree(self.fixture, self.root, dirs_exist_ok=True)
        self.inbox = self.root / "inbox"
        self.quarantine = self.root / "quarantine"
        self.inbox.mkdir()
        self.registry = ContentRegistry(
            root=self.root,
            registry_path="registry.json",
            lock_path="lock.json",
            fingerprint_path="registry-lock.sha256",
        )
        self.processor = ContentInbox(self.registry, self.inbox, self.quarantine)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def stage_addon(self) -> Path:
        source = self.root / "packages/addon.json"
        staged = self.inbox / "addon.json"
        os_bytes = source.read_bytes()
        source.unlink()
        staged.write_bytes(os_bytes)
        return staged

    def test_pinned_candidate_is_atomically_activated(self) -> None:
        staged = self.stage_addon()
        decision = self.processor.process("addon.json", "feature.addon", "1.0.0")

        self.assertEqual(decision.status, "ACTIVATED")
        self.assertFalse(staged.exists())
        self.assertEqual(decision.destination, self.root / "packages/addon.json")
        self.registry.audit()
        self.registry.audit_fingerprint()

    def test_tampered_candidate_is_quarantined_without_target_change(self) -> None:
        staged = self.stage_addon()
        data = json.loads(staged.read_text(encoding="utf-8"))
        data["payload"]["label"] = "Tampered"
        staged.write_text(json.dumps(data) + "\n", encoding="utf-8")

        decision = self.processor.process("addon.json", "feature.addon", "1.0.0")

        self.assertEqual(decision.status, "QUARANTINED")
        self.assertEqual(decision.reason_code, "SSI-CONTENT-0003")
        self.assertTrue((self.quarantine / "addon.json").is_file())
        self.assertFalse((self.root / "packages/addon.json").exists())

    def test_invalid_json_is_quarantined_with_stable_reason(self) -> None:
        candidate = self.inbox / "broken.json"
        candidate.write_text("not-json\n", encoding="utf-8")

        decision = self.processor.process("broken.json", "feature.addon", "1.0.0")

        self.assertEqual(decision.status, "QUARANTINED")
        self.assertEqual(decision.reason_code, "SSI-CONTENT-0001")
        self.assertTrue((self.quarantine / "broken.json").is_file())

    def test_path_escape_and_existing_target_fail_without_mutation(self) -> None:
        outside = self.root / "outside.json"
        outside.write_text("{}\n", encoding="utf-8")
        with self.assertRaises(ContentRegistryError):
            self.processor.process("../outside.json", "feature.addon", "1.0.0")
        self.assertTrue(outside.is_file())

        staged = self.inbox / "addon.json"
        staged.write_bytes((self.root / "packages/addon.json").read_bytes())
        with self.assertRaises(ContentRegistryError):
            self.processor.process("addon.json", "feature.addon", "1.0.0")
        self.assertTrue(staged.is_file())

    def test_activation_race_cannot_clobber_new_target(self) -> None:
        staged = self.stage_addon()
        destination = self.root / "packages/addon.json"
        sentinel = b"external-writer\n"
        real_link = os.link

        def racing_link(source: Path, target: Path) -> None:
            Path(target).write_bytes(sentinel)
            real_link(source, target)

        with patch("content_inbox.os.link", side_effect=racing_link):
            with self.assertRaises(ContentRegistryError):
                self.processor.process("addon.json", "feature.addon", "1.0.0")

        self.assertTrue(staged.is_file())
        self.assertEqual(destination.read_bytes(), sentinel)

    def test_quarantine_race_cannot_clobber_new_target(self) -> None:
        staged = self.stage_addon()
        data = json.loads(staged.read_text(encoding="utf-8"))
        data["payload"]["label"] = "Tampered"
        staged.write_text(json.dumps(data) + "\n", encoding="utf-8")
        destination = self.quarantine / "addon.json"
        sentinel = b"external-quarantine-writer\n"
        real_link = os.link

        def racing_link(source: Path, target: Path) -> None:
            Path(target).write_bytes(sentinel)
            real_link(source, target)

        with patch("content_inbox.os.link", side_effect=racing_link):
            with self.assertRaises(ContentRegistryError):
                self.processor.process("addon.json", "feature.addon", "1.0.0")

        self.assertTrue(staged.is_file())
        self.assertEqual(destination.read_bytes(), sentinel)


if __name__ == "__main__":
    unittest.main()
