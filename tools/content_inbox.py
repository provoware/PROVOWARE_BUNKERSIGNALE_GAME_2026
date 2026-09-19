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

        self._move_no_clobber(
            source,
            destination,
            "Aktivierungsziel existiert bereits.",
        )
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
        self._move_no_clobber(
            source,
            destination,
            "Quarantäneziel existiert bereits.",
        )
        return destination

    def _move_no_clobber(self, source: Path, destination: Path, existing_message: str) -> None:
        """Publish a complete file atomically without ever replacing an existing target.

        Hard-link creation is the no-clobber primitive. If source and destination
        are on different filesystems, activation fails closed and leaves source intact.
        """
        destination.parent.mkdir(parents=True, exist_ok=True)
        try:
            os.link(source, destination)
        except FileExistsError as exc:
            raise ContentRegistryError("SSI-CONTENT-0001", existing_message) from exc
        except OSError as exc:
            detail = exc.strerror or str(exc)
            raise ContentRegistryError(
                "SSI-CONTENT-0001",
                f"Ziel konnte nicht atomar ohne Überschreiben angelegt werden: {detail}",
            ) from exc

        try:
            source.unlink()
        except OSError as exc:
            rollback_error: OSError | None = None
            try:
                destination.unlink()
            except OSError as rollback_exc:
                rollback_error = rollback_exc
            message = "Quellkandidat konnte nach sicherer Zielanlage nicht entfernt werden."
            if rollback_error is not None:
                message += " Ziel-Rollback ist ebenfalls fehlgeschlagen."
            raise ContentRegistryError("SSI-CONTENT-0001", message) from exc
