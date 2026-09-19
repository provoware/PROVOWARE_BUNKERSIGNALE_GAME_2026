from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from event_envelope import validate_event_envelope


@dataclass(frozen=True)
class PureReducerError(ValueError):
    code: str
    message: str

    def __str__(self) -> str:
        return f"{self.code}: {self.message}"


def reduce_events(events: Sequence[Mapping[str, Any]], ruleset: Mapping[str, Any]) -> dict[str, Any]:
    """Replay deterministically from explicit events and ruleset data only."""
    if not isinstance(ruleset, Mapping):
        raise PureReducerError("SSI-REDUCER-0001", "Ruleset muss ein Objekt sein.")
    version = ruleset.get("version")
    initial = ruleset.get("initial_state")
    reducers = ruleset.get("reducers")
    if not isinstance(version, str) or not version:
        raise PureReducerError("SSI-REDUCER-0001", "Ruleset benötigt eine Version.")
    if not isinstance(initial, dict) or not isinstance(reducers, dict):
        raise PureReducerError("SSI-REDUCER-0001", "Ruleset benötigt initial_state und reducers.")

    state = deepcopy(initial)
    last_sequence = 0
    last_lamport = -1

    for raw_event in events:
        if not isinstance(raw_event, Mapping):
            raise PureReducerError("SSI-REDUCER-0002", "Replay akzeptiert nur Event-Objekte.")
        event = dict(raw_event)
        validate_event_envelope(event)
        if event["ruleset_version"] != version:
            raise PureReducerError("SSI-REDUCER-0002", "Event und Ruleset-Version stimmen nicht überein.")
        if event["sequence"] <= last_sequence:
            raise PureReducerError("SSI-REDUCER-0002", "Event-Sequenz muss streng steigen.")
        if event["lamport"] < last_lamport:
            raise PureReducerError("SSI-REDUCER-0002", "Lamport-Zeit darf im Replay nicht zurücklaufen.")

        mapping = reducers.get(event["event_type"])
        if mapping is not None:
            if not isinstance(mapping, dict):
                raise PureReducerError("SSI-REDUCER-0001", "Reducer-Regel muss ein Objekt sein.")
            payload = event["payload"]
            if not isinstance(payload, dict):
                raise PureReducerError("SSI-REDUCER-0002", "Reducer benötigt ein Objekt-Payload.")
            next_state = deepcopy(state)
            for state_key, payload_key in mapping.items():
                if not isinstance(state_key, str) or not isinstance(payload_key, str):
                    raise PureReducerError("SSI-REDUCER-0001", "Reducer-Zuordnungen müssen String-Schlüssel nutzen.")
                if payload_key not in payload:
                    raise PureReducerError("SSI-REDUCER-0002", f"Payload-Feld fehlt: {payload_key}")
                next_state[state_key] = deepcopy(payload[payload_key])
            state = next_state

        last_sequence = event["sequence"]
        last_lamport = event["lamport"]

    return state
