from __future__ import annotations

import json
import re
import sys

from ssi_common import (
    ROOT,
    Issue,
    architecture_violations,
    governed_files,
    read_json,
    scan_forbidden_markers,
)

REQUIRED_FILES = [
    "VERSION",
    "README.md",
    "CHANGELOG.md",
    ".editorconfig",
    ".gitattributes",
    "docs/ARCHITECTURE.md",
    "docs/DEVELOPMENT_RULES.md",
    "docs/GLOBAL_STANDARDS.md",
    "docs/ERROR_HANDLING.md",
    "docs/REGRESSION_POLICY.md",
    "docs/SUBAGENT_PROTOCOL.md",
    "docs/CHANGE_CONTROL.md",
    "docs/QUALITY_GATES.md",
    "docs/decisions/ADR-0001-baseline-architecture.md",
    "manifests/project.manifest.json",
    "manifests/architecture.boundaries.json",
    "manifests/quality.gates.json",
    "manifests/product.dna.json",
    "manifests/toolchain.json",
    "manifests/error.codes.json",
    "manifests/repository.layout.json",
    "manifests/standards.registry.json",
    "agents/registry.json",
    "schemas/project-manifest.schema.json",
    "schemas/status-report.schema.json",
    "schemas/evidence-report.schema.json",
    "schemas/change-record.schema.json",
    "changes/CHG-20260918-001.json",
    "tools/ssi_common.py",
    "tools/validate_repo.py",
    "tools/run_i00_checks.py",
    "tests/test_i00.py",
    "run_i00.sh",
]

SEMVER_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")

def validate_required_files() -> list[Issue]:
    return [
        Issue("SSI-VAL-0001", "ERROR", rel, "Pflichtdatei fehlt.")
        for rel in REQUIRED_FILES
        if not (ROOT / rel).is_file()
    ]

def validate_json_files() -> list[Issue]:
    issues: list[Issue] = []
    for path in sorted(ROOT.rglob("*.json")):
        if "__pycache__" in path.parts or "evidence" in path.parts or "status" in path.parts:
            continue
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            issues.append(Issue("SSI-VAL-0002", "ERROR", path.relative_to(ROOT).as_posix(), str(exc)))
    return issues

def validate_versions() -> list[Issue]:
    issues: list[Issue] = []
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    manifest = read_json(ROOT / "manifests/project.manifest.json")
    if not SEMVER_RE.fullmatch(version):
        issues.append(Issue("SSI-VAL-0003", "ERROR", "VERSION", "Produktversion ist kein gültiges SemVer-Muster."))
    if manifest.get("product_version") != version:
        issues.append(Issue("SSI-VAL-0003", "ERROR", "manifests/project.manifest.json", "Produktversion stimmt nicht mit VERSION überein."))
    if manifest.get("checkpoint") != "I00" or manifest.get("next_checkpoint") != "I01":
        issues.append(Issue("SSI-VAL-0003", "ERROR", "manifests/project.manifest.json", "Checkpointfolge I00 -> I01 ist inkonsistent."))
    return issues

def validate_agent_registry() -> list[Issue]:
    issues: list[Issue] = []
    registry = read_json(ROOT / "agents/registry.json")
    roles = registry.get("roles", [])
    ids = [role.get("id") for role in roles]
    if len(ids) != len(set(ids)):
        issues.append(Issue("SSI-ARCH-0002", "ERROR", "agents/registry.json", "Agenten-IDs sind nicht eindeutig."))
    merge_roles = [role.get("id") for role in roles if role.get("merge_authority") is True]
    if merge_roles != ["orchestrator"]:
        issues.append(Issue("SSI-ARCH-0002", "ERROR", "agents/registry.json", "Nur orchestrator darf Merge-Hoheit besitzen."))
    required = {
        "orchestrator","architecture_guardian","data_schema_auditor","qa_regression",
        "security_integrity","ux_accessibility","content_canon","release_evidence"
    }
    if set(ids) != required:
        issues.append(Issue("SSI-ARCH-0002", "ERROR", "agents/registry.json", "Fachrollenregister ist unvollständig oder enthält unerwartete Rollen."))
    return issues

def validate_standards_registry() -> list[Issue]:
    issues: list[Issue] = []
    registry = read_json(ROOT / "manifests/standards.registry.json")
    actual = {item["id"]: item["version"] for item in registry.get("standards", [])}
    expected = {
        "semver":"2.0.0",
        "conventional_commits":"1.0.0",
        "keep_a_changelog":"1.1.0",
        "json_schema":"2020-12",
        "wcag":"2.2-AA-target",
        "owasp_asvs":"5.0.0-reference",
    }
    for key, value in expected.items():
        if actual.get(key) != value:
            issues.append(Issue("SSI-VAL-0003", "ERROR", "manifests/standards.registry.json", f"Standard {key} muss Version '{value}' tragen."))
    return issues

def validate_schema_headers() -> list[Issue]:
    issues: list[Issue] = []
    expected = "https://json-schema.org/draft/2020-12/schema"
    for path in sorted((ROOT / "schemas").glob("*.schema.json")):
        data = read_json(path)
        if data.get("$schema") != expected:
            issues.append(Issue("SSI-VAL-0003", "ERROR", path.relative_to(ROOT).as_posix(), "Schema verwendet nicht JSON Schema Draft 2020-12."))
    return issues

def validate_line_endings() -> list[Issue]:
    issues: list[Issue] = []
    for path in governed_files(ROOT):
        raw = path.read_bytes()
        if b"\r\n" in raw or b"\r" in raw:
            issues.append(Issue("SSI-VAL-0003", "ERROR", path.relative_to(ROOT).as_posix(), "Datei verwendet nicht ausschließlich LF-Zeilenenden."))
    return issues

def validate_no_code_placeholders() -> list[Issue]:
    issues: list[Issue] = []
    scan_suffixes = {".py", ".js", ".json", ".html", ".css"}
    for path in governed_files(ROOT):
        if path.suffix not in scan_suffixes:
            continue
        text = path.read_text(encoding="utf-8")
        hits = scan_forbidden_markers(text)
        if hits:
            issues.append(Issue("SSI-VAL-0004", "ERROR", path.relative_to(ROOT).as_posix(), "Verbotener Entwicklungsmarker: " + ", ".join(hits)))
    return issues

def validate_architecture_fixtures() -> list[Issue]:
    policy = read_json(ROOT / "manifests/architecture.boundaries.json")
    positive_root = ROOT / "tests/fixtures/architecture/positive"
    negative_root = ROOT / "tests/fixtures/architecture/negative"
    issues: list[Issue] = []
    positive = architecture_violations(positive_root, policy)
    if positive:
        issues.extend(positive)
    negative = architecture_violations(negative_root, policy)
    if not negative:
        issues.append(Issue("SSI-ARCH-0001", "ERROR", "tests/fixtures/architecture/negative", "Negativfixture wurde nicht abgelehnt."))
    issues.extend(architecture_violations(ROOT, policy))
    return issues

def validate_repository() -> list[Issue]:
    checks = [
        validate_required_files,
        validate_json_files,
        validate_versions,
        validate_agent_registry,
        validate_standards_registry,
        validate_schema_headers,
        validate_line_endings,
        validate_no_code_placeholders,
        validate_architecture_fixtures,
    ]
    issues: list[Issue] = []
    for check in checks:
        issues.extend(check())
    return issues

def exit_code_for(issues: list[Issue]) -> int:
    if not issues:
        return 0
    codes = {issue.code for issue in issues}
    if any(code.startswith("SSI-ARCH-") for code in codes):
        return 3
    if any(code.startswith("SSI-INT-") for code in codes):
        return 4
    return 2

def main() -> int:
    issues = validate_repository()
    if not issues:
        print("I00 repository validation: GREEN")
        return 0
    print("I00 repository validation: RED")
    for issue in issues:
        print(f"{issue.code} | {issue.path} | {issue.message}", file=sys.stderr)
    return exit_code_for(issues)

if __name__ == "__main__":
    raise SystemExit(main())
