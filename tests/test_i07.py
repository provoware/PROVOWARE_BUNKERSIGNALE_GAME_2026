from __future__ import annotations

import json
from pathlib import Path
import sys
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from pure_reducer import PureReducerError, reduce_events


class I07PureReducerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.event = json.loads((ROOT / "tests/fixtures/event/positive/envelope.json").read_text(encoding="utf-8"))
        self.ruleset = {
            "version": "1.0.0",
            "initial_state": {"name": "unbekannt", "stable": True},
            "reducers": {"character.created": {"name": "name"}},
        }

    def test_replay_is_deterministic_and_does_not_mutate_inputs(self) -> None:
        event_before = json.dumps(self.event, sort_keys=True)
        ruleset_before = json.dumps(self.ruleset, sort_keys=True)
        first = reduce_events([self.event], self.ruleset)
        second = reduce_events([self.event], self.ruleset)
        self.assertEqual(first, {"name": "PPPOPPI", "stable": True})
        self.assertEqual(first, second)
        self.assertEqual(json.dumps(self.event, sort_keys=True), event_before)
        self.assertEqual(json.dumps(self.ruleset, sort_keys=True), ruleset_before)

    def test_failed_replay_returns_no_partial_state(self) -> None:
        broken = dict(self.event)
        broken["event_id"] = "event:333333333333333333333333"
        broken["sequence"] = 2
        broken["lamport"] = 1
        broken["payload"] = {}
        with self.assertRaises(PureReducerError):
            reduce_events([self.event, broken], self.ruleset)
        self.assertEqual(self.ruleset["initial_state"], {"name": "unbekannt", "stable": True})

    def test_sequence_lamport_and_ruleset_mismatch_fail_closed(self) -> None:
        for field, value in (("sequence", 0), ("lamport", -1), ("ruleset_version", "9.9.9")):
            event = dict(self.event)
            event[field] = value
            with self.subTest(field=field), self.assertRaises(Exception):
                reduce_events([event], self.ruleset)

    def test_unknown_event_is_a_deterministic_noop(self) -> None:
        event = dict(self.event)
        event["event_type"] = "character.observed"
        self.assertEqual(reduce_events([event], self.ruleset), self.ruleset["initial_state"])

    def test_reducer_source_has_no_nondeterministic_or_io_dependencies(self) -> None:
        source = (TOOLS / "pure_reducer.py").read_text(encoding="utf-8")
        forbidden = (
            "datetime", "time.", "random", "open(", "socket", "urllib", "requests",
            "Date(", "Math.random", "localStorage", "sessionStorage", "fetch(", "XMLHttpRequest",
        )
        for token in forbidden:
            with self.subTest(token=token):
                self.assertNotIn(token, source)

    def test_large_replay_profile_is_bounded(self) -> None:
        events = []
        for index in range(1000):
            event = dict(self.event)
            event["event_id"] = f"event:{index + 1:024d}"
            event["sequence"] = index + 1
            event["lamport"] = index
            event["payload"] = {"name": f"actor-{index}"}
            events.append(event)
        started = time.perf_counter()
        state = reduce_events(events, self.ruleset)
        elapsed_ms = (time.perf_counter() - started) * 1000
        self.assertEqual(state["name"], "actor-999")
        self.assertLess(elapsed_ms, 5000)


if __name__ == "__main__":
    unittest.main()
