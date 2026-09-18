from __future__ import annotations

from dataclasses import dataclass, asdict
from hashlib import sha256
from pathlib import Path
import json
import re
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]

GOVERNED_SUFFIXES = {".md", ".json", ".py", ".js", ".css", ".html", ".sh", ".yml", ".yaml"}
EXCLUDED_TOP_LEVEL = {"evidence", "status", ".git"}
FORBIDDEN_MARKER_PARTS = ("TO" + "DO", "T" + "BD", "FIX" + "ME")
IMPORT_RE = re.compile(r"(?:import\s+(?:[^'\"]+?\s+from\s+)?|export\s+[^'\"]+?\s+from\s+)[\"']([^\"']+)[\"']")

@dataclass(frozen=True)
class Issue:
    code: str
    severity: str
    path: str
    message: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)

def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))

def sha256_bytes(data: bytes) -> str:
    return sha256(data).hexdigest()

def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())

def governed_files(root: Path = ROOT) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if rel.parts and rel.parts[0] in EXCLUDED_TOP_LEVEL:
            continue
        if "__pycache__" in rel.parts:
            continue
        if path.suffix in GOVERNED_SUFFIXES or path.name in {"VERSION", ".editorconfig", ".gitattributes", ".gitignore"}:
            files.append(path)
    return sorted(files, key=lambda p: p.relative_to(root).as_posix())

def file_hashes(root: Path = ROOT) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): sha256_file(path)
        for path in governed_files(root)
    }

def repository_fingerprint(root: Path = ROOT) -> tuple[str, dict[str, str]]:
    hashes = file_hashes(root)
    payload = "".join(f"{path}:{digest}\n" for path, digest in sorted(hashes.items()))
    return sha256_bytes(payload.encode("utf-8")), hashes

def scan_forbidden_markers(text: str) -> list[str]:
    hits: list[str] = []
    upper = text.upper()
    for marker in FORBIDDEN_MARKER_PARTS:
        if marker in upper:
            hits.append(marker)
    if re.search(r"<(?:INSERT|PLACEHOLDER|VALUE|PATH|NAME|ID)>", upper):
        hits.append("ANGLE_PLACEHOLDER")
    return sorted(set(hits))

def layer_for_relative_path(path: Path) -> str | None:
    parts = path.as_posix().split("/")
    try:
        index = parts.index("app")
    except ValueError:
        return None
    if len(parts) <= index + 1:
        return None
    return parts[index + 1]

def relative_import_targets(source_path: Path, source_text: str) -> Iterable[tuple[str, Path]]:
    for match in IMPORT_RE.finditer(source_text):
        spec = match.group(1)
        if not spec.startswith("."):
            continue
        yield spec, (source_path.parent / spec).resolve()

def architecture_violations(tree_root: Path, policy: dict) -> list[Issue]:
    violations: list[Issue] = []
    app_root = tree_root / policy["root"]
    if not app_root.exists():
        return violations
    layer_policy = policy["layers"]
    for source in sorted(app_root.rglob("*.js")):
        source_rel = source.relative_to(tree_root)
        source_layer = layer_for_relative_path(source_rel)
        if source_layer not in layer_policy:
            continue
        allowed = set(layer_policy[source_layer]["allowed_import_layers"])
        text = source.read_text(encoding="utf-8")
        for spec, target_abs in relative_import_targets(source, text):
            try:
                target_rel = target_abs.relative_to(tree_root.resolve())
            except ValueError:
                continue
            target_layer = layer_for_relative_path(target_rel)
            if target_layer and target_layer not in allowed:
                violations.append(
                    Issue(
                        code=policy["violation_code"],
                        severity="ERROR",
                        path=source_rel.as_posix(),
                        message=f"Layer '{source_layer}' darf nicht nach '{target_layer}' importieren: {spec}",
                    )
                )
    return violations
