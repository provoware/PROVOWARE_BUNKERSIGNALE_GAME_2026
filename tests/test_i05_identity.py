from __future__ import annotations

import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from domain_identity import IdentityError, canonical_json_bytes, stable_id, validate_stable_id


class I05IdentityContractTests(unittest.TestCase):
    def test_all_id_kinds_are_stable_and_typed(self) -> None:
        for kind in ("world", "actor", "object", "event"):
            first = stable_id(kind, "fixture/core")
            second = stable_id(kind, "fixture/core")
            self.assertEqual(first, second)
            self.assertEqual(validate_stable_id(first, expected_kind=kind), first)

    def test_line_endings_do_not_change_ids(self) -> None:
        self.assertEqual(stable_id("event", "a\r\nb"), stable_id("event", "a\nb"))
        self.assertEqual(stable_id("event", "a\rb"), stable_id("event", "a\nb"))

    def test_canonical_json_is_byte_identical_for_key_order_unicode_and_line_endings(self) -> None:
        a = {"z": 7, "name": "PPPOPPI ä", "text": "A\r\nB", "nested": {"b": 2, "a": 1}}
        b = {"nested": {"a": 1, "b": 2}, "text": "A\nB", "name": "PPPOPPI ä", "z": 7}
        expected = '{"name":"PPPOPPI ä","nested":{"a":1,"b":2},"text":"A\\nB","z":7}'.encode("utf-8")
        self.assertEqual(canonical_json_bytes(a), expected)
        self.assertEqual(canonical_json_bytes(b), expected)

    def test_unstable_values_are_rejected(self) -> None:
        for value in (float("nan"), float("inf"), {1: "not-a-string-key"}, {"x"}):
            with self.subTest(value=repr(value)), self.assertRaises(IdentityError):
                canonical_json_bytes(value)

    def test_invalid_ids_are_rejected(self) -> None:
        for value in ("event:ABC", "event:123", "unknown:" + "a" * 24, ""):
            with self.subTest(value=value), self.assertRaises(IdentityError):
                validate_stable_id(value)

    def test_contract_manifest_matches_runtime_rules(self) -> None:
        contract = json.loads((ROOT / "manifests/domain.identity.json").read_text(encoding="utf-8"))
        self.assertEqual(contract["id_kinds"], ["world", "actor", "object", "event"])
        self.assertTrue(contract["canonical_json"]["reject_non_finite_numbers"])


if __name__ == "__main__":
    unittest.main()
