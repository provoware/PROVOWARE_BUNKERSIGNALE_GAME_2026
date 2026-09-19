from __future__ import annotations

from hashlib import sha256
import json
import math
import re
from typing import Any

ID_KINDS = ("world", "actor", "object", "event")
ID_RE = re.compile(r"^(world|actor|object|event):[0-9a-f]{24}$")


class IdentityError(ValueError):
    pass


def stable_id(kind: str, stable_key: str) -> str:
    if kind not in ID_KINDS:
        raise IdentityError(f"Unbekannte ID-Klasse: {kind}")
    if not isinstance(stable_key, str) or not stable_key.strip():
        raise IdentityError("stable_key muss eine nichtleere Zeichenkette sein.")
    canonical_key = stable_key.replace("\r\n", "\n").replace("\r", "\n")
    digest = sha256(f"{kind}\n{canonical_key}".encode("utf-8")).hexdigest()[:24]
    return f"{kind}:{digest}"


def validate_stable_id(value: str, *, expected_kind: str | None = None) -> str:
    if not isinstance(value, str) or ID_RE.fullmatch(value) is None:
        raise IdentityError("Ungültige stabile ID.")
    kind = value.split(":", 1)[0]
    if expected_kind is not None and kind != expected_kind:
        raise IdentityError(f"ID-Klasse {kind} passt nicht zu {expected_kind}.")
    return value


def _normalize(value: Any) -> Any:
    if value is None or isinstance(value, (bool, int)):
        return value
    if isinstance(value, float):
        if not math.isfinite(value):
            raise IdentityError("NaN und Infinity sind in Canonical JSON verboten.")
        return value
    if isinstance(value, str):
        return value.replace("\r\n", "\n").replace("\r", "\n")
    if isinstance(value, list):
        return [_normalize(item) for item in value]
    if isinstance(value, dict):
        if not all(isinstance(key, str) for key in value):
            raise IdentityError("Canonical JSON erlaubt nur String-Schlüssel.")
        return {key: _normalize(value[key]) for key in sorted(value)}
    raise IdentityError(f"Nicht stabil serialisierbarer Typ: {type(value).__name__}")


def canonical_json_bytes(value: Any) -> bytes:
    normalized = _normalize(value)
    return json.dumps(
        normalized,
        ensure_ascii=False,
        allow_nan=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
