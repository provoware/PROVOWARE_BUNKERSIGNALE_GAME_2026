"""Prueft den Vorrelease-Katalog, ohne technische Freigaben zu erfinden."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re

MATRIX = Path(__file__).resolve().parents[1] / "docs/prerelease_matrix.json"
CATEGORIES = {
    "scope", "content", "gameplay", "balance", "full_run", "negative",
    "persistence", "security", "graphics", "ux", "accessibility",
    "performance", "stability", "installation", "automation",
    "documentation", "approval",
}
SHA = re.compile(r"[0-9a-f]{40}\Z")
ID = re.compile(r"[A-Z][A-Z0-9]*-[0-9]{2}\Z")
STATES = {"PASS", "FAIL", "BLOCKED", "OPEN", "DEFERRED"}


def audit(matrix: dict) -> tuple[list[str], bool, bool]:
    problems: list[str] = []
    items = matrix.get("items")
    if not isinstance(items, list) or not items:
        return ["items fehlt oder ist leer"], False, False
    baseline = matrix.get("baseline_sha")
    candidate = matrix.get("candidate_sha")
    if not isinstance(baseline, str) or not SHA.fullmatch(baseline):
        problems.append("baseline_sha ungueltig")
    if candidate is not None and (not isinstance(candidate, str) or not SHA.fullmatch(candidate)):
        problems.append("candidate_sha ungueltig")
    seen: set[str] = set()
    categories: set[str] = set()
    technical_ready = candidate is not None
    personal_ready = candidate is not None
    for index, row in enumerate(items, 1):
        if not isinstance(row, dict):
            problems.append(f"Zeile {index}: kein Objekt")
            technical_ready = personal_ready = False
            continue
        ident = row.get("id")
        if not isinstance(ident, str) or not ID.fullmatch(ident) or ident in seen:
            problems.append(f"Zeile {index}: ungueltige/doppelte ID")
        if isinstance(ident, str):
            seen.add(ident)
        category = row.get("category")
        if category not in CATEGORIES:
            problems.append(f"{ident}: unbekannte Kategorie")
        else:
            categories.add(category)
        phase = row.get("phase")
        state = row.get("status")
        if phase not in ("technical", "personal") or state not in STATES:
            problems.append(f"{ident}: Phase/Status ungueltig")
        if not isinstance(row.get("requirement"), str) or not row["requirement"].strip():
            problems.append(f"{ident}: Pflichttext fehlt")
        if state == "PASS":
            evidence = row.get("evidence")
            verified = row.get("verified_sha")
            if (not isinstance(evidence, list) or not evidence or
                    not all(isinstance(url, str) and url.startswith("https://github.com/provoware/PROVOWARE_BUNKERSIGNALE_GAME_2026/") for url in evidence) or
                    not isinstance(verified, str) or not SHA.fullmatch(verified)):
                problems.append(f"{ident}: PASS ohne gueltige GitHub-Evidence und SHA")
            if verified != candidate:
                if phase == "technical":
                    technical_ready = False
                else:
                    personal_ready = False
        else:
            if not isinstance(row.get("next_action"), str) or not row["next_action"].strip():
                problems.append(f"{ident}: offene Pflicht ohne naechste Arbeit")
            if phase == "technical":
                technical_ready = False
            else:
                personal_ready = False
            if state == "DEFERRED" and phase != "personal":
                problems.append(f"{ident}: DEFERRED nur fuer persoenliche Endabnahme")
    if categories != CATEGORIES:
        problems.append("Kategorien unvollstaendig: " + ", ".join(sorted(CATEGORIES - categories)))
    if not any(row.get("phase") == "personal" for row in items if isinstance(row, dict)):
        problems.append("persoenliche Endabnahme fehlt")
    if not any(row.get("phase") == "technical" for row in items if isinstance(row, dict)):
        problems.append("technische Pflichten fehlen")
    release_ready = bool(technical_ready and personal_ready and matrix.get("release_approved") is True)
    if matrix.get("technical_ready") is not technical_ready:
        problems.append("technical_ready widerspricht den Einzelpflichten")
    if matrix.get("release_ready") is not release_ready:
        problems.append("release_ready widerspricht den Einzelpflichten oder der Freigabe")
    if not isinstance(matrix.get("release_approved"), bool):
        problems.append("release_approved muss boolesch sein")
    return problems, bool(technical_ready and not problems), bool(release_ready and not problems)


def main() -> int:
    parser = argparse.ArgumentParser(description="Vorrelease-Pflichtmatrix pruefen")
    parser.add_argument("--matrix", type=Path, default=MATRIX)
    parser.add_argument("--require-technical-ready", action="store_true")
    parser.add_argument("--require-release-ready", action="store_true")
    args = parser.parse_args()
    try:
        matrix = json.loads(args.matrix.read_text(encoding="utf-8"))
        problems, technical, release = audit(matrix)
    except (OSError, ValueError, TypeError) as exc:
        print(f"FAIL: Matrix nicht lesbar: {exc}")
        return 1
    if problems:
        for problem in problems:
            print("FAIL:", problem)
        return 1
    print(f"PASS: Matrix konsistent ({len(matrix['items'])} Pflichten)")
    print(f"TECHNICAL_READY={technical}; RELEASE_READY={release}")
    if args.require_release_ready and not release:
        print("BLOCKED: ausdrueckliche Release-Freigabe und alle Pflichten fehlen")
        return 3
    if args.require_technical_ready and not technical:
        print("BLOCKED: technische Vorrelease-Pflichten sind offen")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
