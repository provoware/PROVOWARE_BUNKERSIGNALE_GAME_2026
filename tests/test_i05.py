from __future__ import annotations

from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from content_hot_swap import ContentHotSwapPolicy, HOT_SWAP_CLASSES


class I05ContentHotSwapPolicyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.policy = ContentHotSwapPolicy(ROOT)

    def test_policy_covers_all_four_masterplan_classes(self) -> None:
        self.assertEqual(set(self.policy.policy["content_kinds"].values()), HOT_SWAP_CLASSES)
        self.assertEqual(self.policy.classify("text"), "immediate_safe")

    def test_unknown_content_kind_falls_back_to_restart(self) -> None:
        self.assertEqual(self.policy.classify("future_content"), "restart_required")

    def test_immediate_text_change_is_allowed_without_mutation(self) -> None:
        before_registry = (ROOT / "manifests/content.registry.json").read_bytes()
        before_lock = (ROOT / "manifests/content.lock.json").read_bytes()
        decision = self.policy.decide("text", world_running=True)
        self.assertTrue(decision.allowed_now)
        self.assertEqual(decision.action, "APPLY_NOW")
        self.assertEqual(before_registry, (ROOT / "manifests/content.registry.json").read_bytes())
        self.assertEqual(before_lock, (ROOT / "manifests/content.lock.json").read_bytes())

    def test_restart_class_never_claims_live_activation(self) -> None:
        decision = self.policy.decide("ruleset", world_running=False)
        self.assertFalse(decision.allowed_now)
        self.assertEqual(decision.action, "RESTART_REQUIRED")

    def test_migration_class_requires_ready_migration_and_stopped_world(self) -> None:
        self.assertFalse(self.policy.decide("schema_bound", world_running=False).allowed_now)
        self.assertFalse(self.policy.decide("schema_bound", world_running=True, migration_ready=True).allowed_now)
        ready = self.policy.decide("schema_bound", world_running=False, migration_ready=True)
        self.assertTrue(ready.allowed_now)
        self.assertEqual(ready.action, "APPLY_WITH_MIGRATION")

    def test_world_core_is_blocked_while_running(self) -> None:
        running = self.policy.decide("world_core", world_running=True)
        stopped = self.policy.decide("world_core", world_running=False)
        self.assertFalse(running.allowed_now)
        self.assertEqual(running.action, "BLOCKED_WHILE_RUNNING")
        self.assertTrue(stopped.allowed_now)
        self.assertEqual(stopped.action, "APPLY_WHEN_STOPPED")


if __name__ == "__main__":
    unittest.main()
