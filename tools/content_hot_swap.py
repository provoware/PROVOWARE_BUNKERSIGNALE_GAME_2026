from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from ssi_common import ROOT, read_json

HOT_SWAP_CLASSES = {
    "immediate_safe",
    "restart_required",
    "migration_required",
    "blocked_while_world_running",
}


@dataclass(frozen=True)
class HotSwapDecision:
    content_kind: str
    hot_swap_class: str
    action: str
    allowed_now: bool
    reason: str


@dataclass(frozen=True)
class ContentHotSwapError(Exception):
    code: str
    message: str

    def __str__(self) -> str:
        return f"{self.code}: {self.message}"


class ContentHotSwapPolicy:
    """Read-only I05 policy for deterministic content hot-swap decisions."""

    def __init__(self, root: Path = ROOT, policy_path: str = "manifests/content.hot-swap.json") -> None:
        self.root = root.resolve()
        candidate = (self.root / policy_path).resolve()
        try:
            candidate.relative_to(self.root)
        except ValueError as exc:
            raise ContentHotSwapError("SSI-CONTENT-0001", "Hot-Swap-Policy verlässt den erlaubten Root.") from exc
        self.policy_path = candidate
        self.policy = read_json(candidate)
        self._validate()

    def _validate(self) -> None:
        if self.policy.get("version") != "1.0.0":
            raise ContentHotSwapError("SSI-CONTENT-0001", "Hot-Swap-Policy benötigt Version 1.0.0.")
        default_class = self.policy.get("default_class")
        if default_class not in HOT_SWAP_CLASSES:
            raise ContentHotSwapError("SSI-CONTENT-0001", "Ungültige Default-Hot-Swap-Klasse.")
        kinds = self.policy.get("content_kinds")
        if not isinstance(kinds, dict) or not kinds:
            raise ContentHotSwapError("SSI-CONTENT-0001", "Hot-Swap-Policy benötigt Contentklassen.")
        for content_kind, hot_swap_class in kinds.items():
            if not isinstance(content_kind, str) or not content_kind:
                raise ContentHotSwapError("SSI-CONTENT-0001", "Contentklasse besitzt keine stabile ID.")
            if hot_swap_class not in HOT_SWAP_CLASSES:
                raise ContentHotSwapError("SSI-CONTENT-0001", f"Unbekannte Hot-Swap-Klasse für {content_kind}: {hot_swap_class}")
        if set(kinds.values()) != HOT_SWAP_CLASSES:
            raise ContentHotSwapError("SSI-CONTENT-0001", "Die Policy muss alle vier verbindlichen Hot-Swap-Klassen abdecken.")
        if kinds.get("text") != "immediate_safe":
            raise ContentHotSwapError("SSI-CONTENT-0001", "Textwechsel muss in der sichersten Hot-Swap-Klasse liegen.")

    def classify(self, content_kind: str) -> str:
        return str(self.policy["content_kinds"].get(content_kind, self.policy["default_class"]))

    def decide(self, content_kind: str, *, world_running: bool, migration_ready: bool = False) -> HotSwapDecision:
        hot_swap_class = self.classify(content_kind)
        if hot_swap_class == "immediate_safe":
            return HotSwapDecision(content_kind, hot_swap_class, "APPLY_NOW", True, "Dieser Inhalt ist sofort austauschbar.")
        if hot_swap_class == "restart_required":
            return HotSwapDecision(content_kind, hot_swap_class, "RESTART_REQUIRED", False, "Aktivierung erst nach kontrolliertem Neustart.")
        if hot_swap_class == "migration_required":
            if migration_ready and not world_running:
                return HotSwapDecision(content_kind, hot_swap_class, "APPLY_WITH_MIGRATION", True, "Migration ist vorbereitet und die Welt ist gestoppt.")
            return HotSwapDecision(content_kind, hot_swap_class, "MIGRATION_REQUIRED", False, "Aktivierung benötigt vorbereitete Migration bei gestoppter Welt.")
        if world_running:
            return HotSwapDecision(content_kind, hot_swap_class, "BLOCKED_WHILE_RUNNING", False, "Dieser Inhalt darf während einer laufenden Welt nicht ausgetauscht werden.")
        return HotSwapDecision(content_kind, hot_swap_class, "APPLY_WHEN_STOPPED", True, "Die Welt ist gestoppt; kontrollierter Austausch ist zulässig.")
