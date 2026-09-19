from __future__ import annotations

from dataclasses import dataclass
import json
import re
from time import perf_counter
from typing import Any

from domain_identity import IdentityError, canonical_json_bytes, stable_id, validate_stable_id
from schema_registry import SchemaRegistry, SchemaRegistryError
from ssi_common import ROOT

EVENT_TYPE = re.compile(r"^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$")
SEMVER = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")


@dataclass(frozen=True)
class EventEnvelopeError(ValueError):
    code: str
    message: str

    def __str__(self) -> str:
        return f"{self.code}: {self.message}"


def validate_event_envelope(envelope: dict[str, Any]) -> dict[str, Any]:
    try:
        SchemaRegistry(ROOT).validate("event-envelope", "1.0.0", envelope)
    except SchemaRegistryError as exc:
        raise EventEnvelopeError(exc.code, exc.message) from exc

    try:
        validate_stable_id(envelope["event_id"], expected_kind="event")
        validate_stable_id(envelope["author_id"], expected_kind="actor")
        causation = envelope.get("causation_event_id")
        if causation is not None:
            validate_stable_id(causation, expected_kind="event")
    except IdentityError as exc:
        raise EventEnvelopeError("SSI-EVENT-0001", str(exc)) from exc

    if envelope["sequence"] < 1:
        raise EventEnvelopeError("SSI-EVENT-0001", "sequence muss mindestens 1 sein.")
    if envelope["lamport"] < 0:
        raise EventEnvelopeError("SSI-EVENT-0001", "lamport darf nicht negativ sein.")
    if EVENT_TYPE.fullmatch(envelope["event_type"]) is None:
        raise EventEnvelopeError("SSI-EVENT-0001", "event_type ist ungültig.")
    if SEMVER.fullmatch(envelope["ruleset_version"]) is None:
        raise EventEnvelopeError("SSI-EVENT-0001", "ruleset_version muss exakte SemVer sein.")

    for optional_id in ("command_id", "correlation_id"):
        value = envelope.get(optional_id)
        if value is not None and (not isinstance(value, str) or not value.strip()):
            raise EventEnvelopeError("SSI-EVENT-0001", f"{optional_id} darf nicht leer sein.")

    try:
        canonical_json_bytes(envelope)
    except IdentityError as exc:
        raise EventEnvelopeError("SSI-EVENT-0001", str(exc)) from exc
    return envelope


def event_envelope_bytes(envelope: dict[str, Any]) -> bytes:
    validate_event_envelope(envelope)
    return canonical_json_bytes(envelope)


def read_event_envelope_bytes(data: bytes) -> dict[str, Any]:
    """Read one complete canonical envelope; partial/truncated bytes never become valid state."""
    if not isinstance(data, bytes) or not data:
        raise EventEnvelopeError("SSI-EVENT-0002", "Envelope-Readback benötigt vollständige Bytes.")
    try:
        decoded = data.decode("utf-8")
        envelope = json.loads(decoded)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise EventEnvelopeError("SSI-EVENT-0002", "Envelope-Readback ist unvollständig oder ungültig.") from exc
    if not isinstance(envelope, dict):
        raise EventEnvelopeError("SSI-EVENT-0002", "Envelope-Readback muss ein JSON-Objekt sein.")
    validate_event_envelope(envelope)
    if event_envelope_bytes(envelope) != data:
        raise EventEnvelopeError("SSI-EVENT-0002", "Persistierter Envelope ist nicht kanonisch.")
    return envelope


def profile_event_envelope_readback(count: int, template: dict[str, Any]) -> dict[str, int | float]:
    if not isinstance(count, int) or isinstance(count, bool) or count < 1:
        raise EventEnvelopeError("SSI-EVENT-0002", "Profilanzahl muss mindestens 1 sein.")
    started = perf_counter()
    total_bytes = 0
    for index in range(count):
        envelope = dict(template)
        envelope["event_id"] = stable_id("event", f"i06-profile:{index}")
        envelope["sequence"] = index + 1
        envelope["lamport"] = index
        raw = event_envelope_bytes(envelope)
        read_event_envelope_bytes(raw)
        total_bytes += len(raw)
    elapsed_ms = (perf_counter() - started) * 1000
    return {"count": count, "bytes": total_bytes, "elapsed_ms": round(elapsed_ms, 3)}
