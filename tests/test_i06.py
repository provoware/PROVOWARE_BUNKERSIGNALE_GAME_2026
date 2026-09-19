from __future__ import annotations

import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from event_envelope import EventEnvelopeError, event_envelope_bytes, validate_event_envelope


class I06EventEnvelopeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.positive = json.loads((ROOT / "tests/fixtures/event/positive/envelope.json").read_text(encoding="utf-8"))

    def test_positive_envelope_validates_and_serializes_deterministically(self) -> None:
        self.assertEqual(validate_event_envelope(dict(self.positive)), self.positive)
        reordered = dict(reversed(list(self.positive.items())))
        self.assertEqual(event_envelope_bytes(self.positive), event_envelope_bytes(reordered))

    def test_optional_trace_fields_are_supported(self) -> None:
        envelope = dict(self.positive)
        envelope["causation_event_id"] = "event:333333333333333333333333"
        self.assertEqual(validate_event_envelope(envelope)["causation_event_id"], envelope["causation_event_id"])

    def test_negative_fixtures_are_rejected_for_declared_reason(self) -> None:
        for path in sorted((ROOT / "tests/fixtures/event/negative").glob("*.json")):
            fixture = json.loads(path.read_text(encoding="utf-8"))
            with self.subTest(path=path.name), self.assertRaises(EventEnvelopeError) as raised:
                validate_event_envelope(fixture["instance"])
            self.assertEqual(raised.exception.code, fixture["expected_code"])

    def test_author_must_be_actor_id(self) -> None:
        envelope = dict(self.positive)
        envelope["author_id"] = "event:222222222222222222222222"
        with self.assertRaises(EventEnvelopeError):
            validate_event_envelope(envelope)

    def test_invalid_optional_trace_id_is_rejected(self) -> None:
        envelope = dict(self.positive)
        envelope["command_id"] = "   "
        with self.assertRaises(EventEnvelopeError):
            validate_event_envelope(envelope)

    def test_validation_returns_no_partial_envelope_on_failure(self) -> None:
        envelope = dict(self.positive)
        envelope["sequence"] = 0
        with self.assertRaises(EventEnvelopeError):
            validate_event_envelope(envelope)
        self.assertEqual(envelope["sequence"], 0)


if __name__ == "__main__":
    unittest.main()
