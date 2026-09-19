from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
import re
from typing import Any

from schema_registry import SchemaRegistry
from ssi_common import ROOT, read_json

SEMVER = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
PACKAGE_ID = re.compile(r"^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$")
SHA256 = re.compile(r"^[0-9a-f]{64}$")


@dataclass(frozen=True)
class ContentRegistryError(Exception):
    code: str
    message: str

    def __str__(self) -> str:
        return f"{self.code}: {self.message}"


def sha256_file(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def registry_lock_fingerprint(registry_path: Path, lock_path: Path) -> str:
    registry_hash = sha256_file(registry_path)
    lock_hash = sha256_file(lock_path)
    return sha256(f"{registry_hash}\n{lock_hash}\n".encode("utf-8")).hexdigest()


class ContentRegistry:
    def __init__(
        self,
        root: Path = ROOT,
        registry_path: str = "manifests/content.registry.json",
        lock_path: str = "manifests/content.lock.json",
        fingerprint_path: str | None = "manifests/content.registry-lock.sha256",
    ) -> None:
        self.root = root.resolve()
        self.registry_path = self._local_path(registry_path)
        self.lock_path = self._local_path(lock_path)
        self.fingerprint_path = self._local_path(fingerprint_path) if fingerprint_path else None
        self.registry = read_json(self.registry_path)
        self.lock = read_json(self.lock_path)
        self._packages: dict[tuple[str, str], dict[str, Any]] = {}
        self._pins: dict[tuple[str, str], dict[str, str]] = {}
        self._load()

    def _local_path(self, relative: str) -> Path:
        candidate = Path(relative)
        if candidate.is_absolute():
            raise ContentRegistryError("SSI-CONTENT-0001", "Absolute Pfade sind nicht zulässig.")
        path = (self.root / candidate).resolve()
        try:
            path.relative_to(self.root)
        except ValueError as exc:
            raise ContentRegistryError("SSI-CONTENT-0001", "Content-Pfad verlässt den erlaubten Root.") from exc
        return path

    def _load(self) -> None:
        if self.registry.get("resolution") != "exact_version_only":
            raise ContentRegistryError("SSI-CONTENT-0001", "Nur exakte Content-Versionen sind zulässig.")

        for entry in self.registry.get("packages", []):
            key = (str(entry.get("package_id", "")), str(entry.get("version", "")))
            if not PACKAGE_ID.fullmatch(key[0]) or not SEMVER.fullmatch(key[1]):
                raise ContentRegistryError("SSI-CONTENT-0001", f"Ungültiger Paketschlüssel: {key[0]}@{key[1]}")
            if key in self._packages:
                raise ContentRegistryError("SSI-CONTENT-0001", f"Doppeltes Contentpaket: {key[0]}@{key[1]}")
            self._packages[key] = entry

        for entry in self.lock.get("entries", []):
            key = (str(entry.get("package_id", "")), str(entry.get("version", "")))
            if key in self._pins:
                raise ContentRegistryError("SSI-CONTENT-0001", f"Doppelter Lock-Eintrag: {key[0]}@{key[1]}")
            if not SHA256.fullmatch(str(entry.get("sha256", ""))):
                raise ContentRegistryError("SSI-CONTENT-0001", f"Ungültiger SHA-256-Pin: {key[0]}@{key[1]}")
            self._pins[key] = entry

    def audit(self) -> None:
        schema_registry = SchemaRegistry(ROOT)
        schema_registry.validate("content-registry", "1.0.0", self.registry)
        schema_registry.validate("content-lock", "1.0.0", self.lock)

        package_keys = set(self._packages)
        pin_keys = set(self._pins)
        if package_keys != pin_keys:
            missing_pins = sorted(package_keys - pin_keys)
            stale_pins = sorted(pin_keys - package_keys)
            raise ContentRegistryError(
                "SSI-CONTENT-0001",
                f"Registry/Lock-Schlüssel unterscheiden sich; fehlende Pins={missing_pins}, verwaiste Pins={stale_pins}",
            )

        for key in sorted(package_keys):
            package = self._packages[key]
            pin = self._pins[key]
            if package["path"] != pin["path"]:
                raise ContentRegistryError("SSI-CONTENT-0003", f"Pfad-Pin weicht ab: {key[0]}@{key[1]}")
            package_path = self._local_path(package["path"])
            if not package_path.is_file():
                raise ContentRegistryError("SSI-CONTENT-0002", f"Contentdatei fehlt: {package['path']}")
            if sha256_file(package_path) != pin["sha256"]:
                raise ContentRegistryError("SSI-CONTENT-0003", f"Hash-Pin weicht ab: {key[0]}@{key[1]}")

            for dependency in package.get("dependencies", []):
                dependency_key = (dependency["package_id"], dependency["version"])
                if dependency_key not in self._packages:
                    raise ContentRegistryError(
                        "SSI-CONTENT-0002",
                        f"Abhängigkeit fehlt: {dependency_key[0]}@{dependency_key[1]} für {key[0]}@{key[1]}",
                    )

        for key in sorted(package_keys):
            self.resolve_graph(*key)

    def audit_fingerprint(self) -> str:
        current = registry_lock_fingerprint(self.registry_path, self.lock_path)
        if self.fingerprint_path is None:
            return current
        if not self.fingerprint_path.is_file():
            raise ContentRegistryError("SSI-CONTENT-0004", "Registry/Lock-Fingerprint fehlt.")
        expected = self.fingerprint_path.read_text(encoding="utf-8").strip()
        if not SHA256.fullmatch(expected) or current != expected:
            raise ContentRegistryError("SSI-CONTENT-0004", "Registry/Lock-Fingerprint zeigt Drift.")
        return current

    def resolve(self, package_id: str, version: str) -> dict[str, Any]:
        if not PACKAGE_ID.fullmatch(package_id) or not SEMVER.fullmatch(version):
            raise ContentRegistryError("SSI-CONTENT-0002", "Exakte package_id und SemVer-Version sind erforderlich.")
        key = (package_id, version)
        entry = self._packages.get(key)
        if entry is None:
            raise ContentRegistryError("SSI-CONTENT-0002", f"Unbekanntes Contentpaket: {package_id}@{version}")
        pin = self._pins.get(key)
        if pin is None:
            raise ContentRegistryError("SSI-CONTENT-0003", f"Lock-Pin fehlt: {package_id}@{version}")
        path = self._local_path(entry["path"])
        if not path.is_file() or sha256_file(path) != pin["sha256"]:
            raise ContentRegistryError("SSI-CONTENT-0003", f"Contentpaket stimmt nicht mit Lockfile überein: {package_id}@{version}")
        return read_json(path)

    def verify_candidate(self, candidate_path: Path, package_id: str, version: str) -> Path:
        """Verify an inbox candidate against the registered identity and lock pin."""
        if not PACKAGE_ID.fullmatch(package_id) or not SEMVER.fullmatch(version):
            raise ContentRegistryError("SSI-CONTENT-0002", "Exakte package_id und SemVer-Version sind erforderlich.")
        key = (package_id, version)
        entry = self._packages.get(key)
        pin = self._pins.get(key)
        if entry is None or pin is None:
            raise ContentRegistryError("SSI-CONTENT-0002", f"Unbekanntes Contentpaket: {package_id}@{version}")

        try:
            candidate = read_json(candidate_path)
        except (OSError, ValueError) as exc:
            raise ContentRegistryError("SSI-CONTENT-0001", "Inbox-Kandidat ist kein lesbares JSON-Dokument.") from exc
        if candidate.get("package_id") != package_id or candidate.get("version") != version:
            raise ContentRegistryError("SSI-CONTENT-0003", f"Paketidentität weicht ab: {package_id}@{version}")
        if entry["path"] != pin["path"] or sha256_file(candidate_path) != pin["sha256"]:
            raise ContentRegistryError("SSI-CONTENT-0003", f"Inbox-Kandidat stimmt nicht mit Lockfile überein: {package_id}@{version}")
        self.resolve_graph(package_id, version)
        return self._local_path(entry["path"])

    def resolve_graph(self, package_id: str, version: str) -> list[tuple[str, str]]:
        start = (package_id, version)
        if start not in self._packages:
            raise ContentRegistryError("SSI-CONTENT-0002", f"Unbekanntes Contentpaket: {package_id}@{version}")

        ordered: list[tuple[str, str]] = []
        visiting: set[tuple[str, str]] = set()
        visited: set[tuple[str, str]] = set()

        def visit(key: tuple[str, str]) -> None:
            if key in visiting:
                raise ContentRegistryError("SSI-CONTENT-0002", f"Zyklische Content-Abhängigkeit bei {key[0]}@{key[1]}")
            if key in visited:
                return
            visiting.add(key)
            entry = self._packages[key]
            dependencies = sorted(
                ((item["package_id"], item["version"]) for item in entry.get("dependencies", [])),
                key=lambda item: (item[0], item[1]),
            )
            for dependency in dependencies:
                if dependency not in self._packages:
                    raise ContentRegistryError("SSI-CONTENT-0002", f"Abhängigkeit fehlt: {dependency[0]}@{dependency[1]}")
                visit(dependency)
            visiting.remove(key)
            visited.add(key)
            ordered.append(key)

        visit(start)
        return ordered
