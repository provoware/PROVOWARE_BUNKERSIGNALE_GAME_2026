from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
import re
from typing import Any

from ssi_common import ROOT, read_json

SEMVER = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema"
LIFECYCLE_STATES = ("active", "deprecated", "retired")
LIFECYCLE_TRANSITIONS = ("active->deprecated", "deprecated->retired")


@dataclass(frozen=True)
class SchemaRegistryError(Exception):
    code: str
    message: str

    def __str__(self) -> str:
        return f"{self.code}: {self.message}"


class SchemaRegistry:
    def __init__(self, root: Path = ROOT, registry_path: str = "manifests/schema.registry.json") -> None:
        self.root = root.resolve()
        self.registry_path = self.root / registry_path
        self.data = read_json(self.registry_path)
        self._entries: dict[tuple[str, str], dict[str, str]] = {}
        self._load_entries()

    def _load_entries(self) -> None:
        if self.data.get("resolution") != "exact_version_only":
            raise SchemaRegistryError("SSI-SCHEMA-0001", "Nur exakte Versionsauflösung ist zulässig.")
        lifecycle = self.data.get("lifecycle", {})
        if tuple(lifecycle.get("states", [])) != LIFECYCLE_STATES or tuple(lifecycle.get("transitions", [])) != LIFECYCLE_TRANSITIONS:
            raise SchemaRegistryError("SSI-SCHEMA-0001", "Der Schema-Lifecycle ist ungültig.")
        for entry in self.data.get("entries", []):
            key = (entry.get("name", ""), entry.get("version", ""))
            if key in self._entries:
                raise SchemaRegistryError("SSI-SCHEMA-0001", f"Doppelter Registry-Schlüssel: {key[0]}@{key[1]}")
            self._entries[key] = entry

    def audit(self) -> None:
        if self.data.get("version") != "1.0.0" or not self._entries:
            raise SchemaRegistryError("SSI-SCHEMA-0001", "Registry-Kopf oder Einträge fehlen.")
        for (name, version), entry in self._entries.items():
            if not name or not SEMVER.fullmatch(version):
                raise SchemaRegistryError("SSI-SCHEMA-0001", f"Ungültiger Registry-Schlüssel: {name}@{version}")
            if entry.get("status") not in LIFECYCLE_STATES:
                raise SchemaRegistryError("SSI-SCHEMA-0001", f"Ungültiger Lifecycle-Status: {name}@{version}")
            path = self._local_path(entry.get("path", ""))
            if not path.is_file():
                raise SchemaRegistryError("SSI-SCHEMA-0001", f"Schema fehlt: {entry.get('path', '')}")
            schema = read_json(path)
            if schema.get("$schema") != SCHEMA_DIALECT or schema.get("$id") != entry.get("schema_id"):
                raise SchemaRegistryError("SSI-SCHEMA-0001", f"Schema-Identität inkonsistent: {name}@{version}")
            if not str(entry["schema_id"]).endswith(f"/{name}/{version}"):
                raise SchemaRegistryError("SSI-SCHEMA-0001", f"Schema-ID passt nicht zu Schlüssel: {name}@{version}")

    def _local_path(self, relative: str) -> Path:
        path = (self.root / relative).resolve()
        if self.root not in path.parents:
            raise SchemaRegistryError("SSI-SCHEMA-0001", "Schema-Pfad verlässt das Repository.")
        return path

    def resolve(self, name: str, version: str, *, allow_deprecated: bool = False) -> dict[str, Any]:
        if not SEMVER.fullmatch(version):
            raise SchemaRegistryError("SSI-SCHEMA-0002", "Eine exakte SemVer-Version ist erforderlich.")
        entry = self._entries.get((name, version))
        if entry is None:
            raise SchemaRegistryError("SSI-SCHEMA-0002", f"Unbekanntes Schema: {name}@{version}")
        status = entry["status"]
        if status == "retired" or (status == "deprecated" and not allow_deprecated):
            raise SchemaRegistryError("SSI-SCHEMA-0003", f"Schema ist nicht aktiv: {name}@{version} ({status})")
        return read_json(self._local_path(entry["path"]))

    def validate(self, name: str, version: str, instance: Any, *, allow_deprecated: bool = False) -> None:
        schema = self.resolve(name, version, allow_deprecated=allow_deprecated)
        problems: list[str] = []
        _validate_node(instance, schema, "$", problems)
        if problems:
            raise SchemaRegistryError("SSI-SCHEMA-0004", "; ".join(problems))


def _validate_node(value: Any, schema: dict[str, Any], path: str, problems: list[str]) -> None:
    expected = schema.get("type")
    type_checks = {
        "object": lambda item: isinstance(item, dict),
        "array": lambda item: isinstance(item, list),
        "string": lambda item: isinstance(item, str),
        "boolean": lambda item: isinstance(item, bool),
        "integer": lambda item: isinstance(item, int) and not isinstance(item, bool),
        "number": lambda item: isinstance(item, (int, float)) and not isinstance(item, bool),
        "null": lambda item: item is None,
    }
    if expected in type_checks and not type_checks[expected](value):
        problems.append(f"{path}: erwartet {expected}")
        return
    if "const" in schema and value != schema["const"]:
        problems.append(f"{path}: Wert entspricht nicht const")
    if "enum" in schema and value not in schema["enum"]:
        problems.append(f"{path}: Wert ist nicht in enum")
    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0):
            problems.append(f"{path}: Zeichenkette ist zu kurz")
        if "pattern" in schema and re.search(schema["pattern"], value) is None:
            problems.append(f"{path}: Zeichenkette verletzt pattern")
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0) or len(value) > schema.get("maxItems", len(value)):
            problems.append(f"{path}: Array-Länge ist ungültig")
        if schema.get("uniqueItems") and len({json.dumps(item, sort_keys=True) for item in value}) != len(value):
            problems.append(f"{path}: Array-Einträge sind nicht eindeutig")
        if isinstance(schema.get("items"), dict):
            for index, item in enumerate(value):
                _validate_node(item, schema["items"], f"{path}[{index}]", problems)
    if isinstance(value, dict):
        required = schema.get("required", [])
        for key in required:
            if key not in value:
                problems.append(f"{path}: Pflichtfeld '{key}' fehlt")
        properties = schema.get("properties", {})
        for key, item in value.items():
            child_schema = properties.get(key)
            if child_schema is not None:
                _validate_node(item, child_schema, f"{path}.{key}", problems)
            elif schema.get("additionalProperties") is False:
                problems.append(f"{path}: unbekanntes Feld '{key}'")
            elif isinstance(schema.get("additionalProperties"), dict):
                _validate_node(item, schema["additionalProperties"], f"{path}.{key}", problems)
