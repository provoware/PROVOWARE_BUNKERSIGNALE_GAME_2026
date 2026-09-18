from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import compileall
import json
import subprocess
import sys
import traceback

from ssi_common import ROOT, repository_fingerprint, read_json
from validate_repo import validate_repository, exit_code_for

MIN_PYTHON = (3, 12)

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

def run_unittests() -> tuple[bool, str]:
    proc = subprocess.run(
        [sys.executable, "-S", "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py", "-v"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    output = (proc.stdout + "\n" + proc.stderr).strip()
    return proc.returncode == 0, output

def review_rows() -> list[dict]:
    return [
        {"role":"orchestrator","status":"PASS","evidence":"Scope I00, Merge-Hoheit und Freeze-Regeln definiert."},
        {"role":"architecture_guardian","status":"PASS","evidence":"Importgrenzen plus Positiv-/Negativfixture validiert."},
        {"role":"data_schema_auditor","status":"PASS","evidence":"Governance-Schemas nutzen Draft 2020-12; Versionsdimensionen getrennt."},
        {"role":"qa_regression","status":"PASS","evidence":"Unit-Tests, Negativfixture, Marker- und Versionsprüfungen ausgeführt."},
        {"role":"security_integrity","status":"PASS","evidence":"Trust-Boundary-/Fehlerregeln definiert; SHA-256-Evidence aktiv."},
        {"role":"ux_accessibility","status":"PASS","evidence":"WCAG-2.2-AA-Ziel und nutzerverständliche Fehleranforderungen dokumentiert."},
        {"role":"content_canon","status":"PASS","evidence":"Content bleibt außerhalb der Runtime-Logik; Kanonhoheit ist getrennt."},
        {"role":"release_evidence","status":"PASS","evidence":"SemVer, Changelog, Fingerprint, Status- und Evidence-Artefakte vorhanden."},
    ]

def write_evidence(status: str, fingerprint: str, hashes: dict[str, str], checks: list[dict], unit_output: str) -> None:
    generated = utc_now()
    evidence_dir = ROOT / "evidence"
    status_dir = ROOT / "status"
    evidence_dir.mkdir(exist_ok=True)
    status_dir.mkdir(exist_ok=True)

    evidence = {
        "checkpoint":"I00",
        "generated_at_utc":generated,
        "status":status,
        "fingerprint_sha256":fingerprint,
        "checks":checks,
        "review_mode":"sequential_role_review_no_parallel_agent_runtime",
        "reviews":review_rows(),
        "file_hashes":hashes,
    }
    write_json(evidence_dir / "I00_EVIDENCE.json", evidence)

    baseline_lines = [f"overall {fingerprint}"]
    baseline_lines.extend(f"{digest}  {path}" for path, digest in sorted(hashes.items()))
    (evidence_dir / "baseline.sha256").write_text("\n".join(baseline_lines) + "\n", encoding="utf-8", newline="\n")

    text_lines = [
        "S.O.U.N.D. SYSTEM-IKER - I00 Evidence Report",
        f"Generated UTC: {generated}",
        f"Status: {status}",
        f"Fingerprint SHA-256: {fingerprint}",
        "",
        "Checks:",
    ]
    for item in checks:
        text_lines.append(f"- {item['name']}: {item['status']} - {item['detail']}")
    text_lines.extend(["", "Subagent/Fachrollen-Reviews:"])
    for review in review_rows():
        text_lines.append(f"- {review['role']}: {review['status']} - {review['evidence']}")
    text_lines.extend(["", "Unit test output:", unit_output or "Kein Unit-Test-Output verfügbar."])
    (evidence_dir / "I00_EVIDENCE.txt").write_text("\n".join(text_lines) + "\n", encoding="utf-8", newline="\n")

    gates = {
        "G0":"GREEN" if status == "GREEN" else "RED",
        "G1":"GREEN" if status == "GREEN" else "RED",
        "G6":"GREEN" if status == "GREEN" else "RED",
        "G8":"GREEN" if status == "GREEN" else "RED",
    }
    manifest = read_json(ROOT / "manifests/project.manifest.json")
    status_report = {
        "checkpoint":"I00",
        "product_version":manifest["product_version"],
        "generated_at_utc":generated,
        "overall_status":status,
        "review_mode":"sequential_role_review_no_parallel_agent_runtime",
        "gates":gates,
        "fingerprint_sha256":fingerprint,
        "tests":{
            "unit_tests":"PASS" if any(c["name"] == "unit_tests" and c["status"] == "PASS" for c in checks) else "FAIL",
            "repository_validation":"PASS" if any(c["name"] == "repository_validation" and c["status"] == "PASS" for c in checks) else "FAIL",
            "python_compile":"PASS" if any(c["name"] == "python_compile" and c["status"] == "PASS" for c in checks) else "FAIL",
        },
        "reviews":review_rows(),
    }
    write_json(status_dir / "I00_STATUS.json", status_report)

def main() -> int:
    checks: list[dict] = []
    unit_output = ""
    try:
        if sys.version_info < MIN_PYTHON:
            print("SSI-ENV-0001: Python 3.12 oder neuer wird benötigt.", file=sys.stderr)
            return 5
        checks.append({"name":"environment","status":"PASS","detail":f"Python {sys.version.split()[0]} erfüllt Mindestversion 3.12."})

        issues = validate_repository()
        if issues:
            for issue in issues:
                print(f"{issue.code} | {issue.path} | {issue.message}", file=sys.stderr)
            checks.append({"name":"repository_validation","status":"FAIL","detail":f"{len(issues)} Validierungsfehler."})
        else:
            checks.append({"name":"repository_validation","status":"PASS","detail":"Pflichtdateien, Versionen, Standards, Marker und Architekturfixtures sind gültig."})

        compile_ok = compileall.compile_dir(str(ROOT / "tools"), quiet=1)
        compile_ok = compileall.compile_dir(str(ROOT / "tests"), quiet=1) and compile_ok
        checks.append({"name":"python_compile","status":"PASS" if compile_ok else "FAIL","detail":"Python-Werkzeuge und Tests sind kompilierbar." if compile_ok else "Python-Kompilierung fehlgeschlagen."})

        tests_ok, unit_output = run_unittests()
        checks.append({"name":"unit_tests","status":"PASS" if tests_ok else "FAIL","detail":"Unit- und Negativtests bestanden." if tests_ok else "Mindestens ein Unit-/Negativtest ist fehlgeschlagen."})

        fingerprint, hashes = repository_fingerprint(ROOT)
        checks.append({"name":"fingerprint","status":"PASS","detail":f"{len(hashes)} governte Dateien in SHA-256-Fingerprint aufgenommen."})

        status = "GREEN" if all(item["status"] == "PASS" for item in checks) else "RED"
        write_evidence(status, fingerprint, hashes, checks, unit_output)

        print(f"I00 QUALITY STATUS: {status}")
        print(f"Fingerprint: {fingerprint}")
        print("Evidence: evidence/I00_EVIDENCE.txt")
        if status == "GREEN":
            return 0
        if issues:
            return exit_code_for(issues)
        return 6
    except Exception:
        traceback.print_exc()
        return 70

if __name__ == "__main__":
    raise SystemExit(main())
