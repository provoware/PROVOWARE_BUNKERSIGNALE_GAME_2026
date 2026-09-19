from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path

from content_registry import ContentRegistry, ContentRegistryError


@dataclass(frozen=True)
class InboxDecision:
    status: str
    source: Path
    destination: Path
    reason_code: str | None = None


class ContentInbox:
    """Move one local candidate to its pinned target or into quarantine."""

    def __init__(self, registry: ContentRegistry, inbox: Path, quarantine: Path) -> None:
        self.registry = registry
        self.inbox = inbox.resolve()
        self.quarantine = quarantine.resolve()

    def process(self, candidate_name: str, package_id: str, version: str) -> InboxDecision:
        source = self._contained_candidate(candidate_name)
        try:
            destination = self.registry.verify_candidate(source, package_id, version)
        except ContentRegistryError as exc:
            quarantined = self._quarantine(source)
            return InboxDecision("QUARANTINED", source, quarantined, exc.code)

        if destination.exists():
            raise ContentRegistryError("SSI-CONTENT-0001", "Aktivierungsziel existiert bereits.")
        destination.parent.mkdir(parents=True, exist_ok=True)
        os.replace(source, destination)
        return InboxDecision("ACTIVATED", source, destination)

    def _contained_candidate(self, candidate_name: str) -> Path:
        if Path(candidate_name).name != candidate_name:
            raise ContentRegistryError("SSI-CONTENT-0001", "Inbox-Kandidat muss ein einfacher Dateiname sein.")
        source = (self.inbox / candidate_name).resolve()
        try:
            source.relative_to(self.inbox)
        except ValueError as exc:
            raise ContentRegistryError("SSI-CONTENT-0001", "Inbox-Kandidat verlässt den erlaubten Pfad.") from exc
        if not source.is_file():
            raise ContentRegistryError("SSI-CONTENT-0001", "Inbox-Kandidat fehlt oder ist keine Datei.")
        return source

    def _quarantine(self, source: Path) -> Path:
        destination = self.quarantine / source.name
        if destination.exists():
            raise ContentRegistryError("SSI-CONTENT-0001", "Quarantäneziel existiert bereits.")
        self.quarantine.mkdir(parents=True, exist_ok=True)
        os.replace(source, destination)
        return destination
