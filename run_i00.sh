#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if command -v python3 >/dev/null 2>&1; then
  exec python3 tools/run_i00_checks.py
fi

printf '%s\n' "SSI-ENV-0001: python3 wurde nicht gefunden. Benötigt wird Python 3.12 oder neuer." >&2
exit 5
