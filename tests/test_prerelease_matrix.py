from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from prerelease_gate import audit


class PrereleaseGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.matrix = json.loads((ROOT / "docs/prerelease_matrix.json").read_text(encoding="utf-8"))

    def test_matrix_is_complete_but_not_ready(self):
        problems, technical, release = audit(self.matrix)
        self.assertEqual(problems, [])
        self.assertFalse(technical)
        self.assertFalse(release)
        self.assertGreaterEqual(len(self.matrix["items"]), 35)

    def test_duplicate_id_is_rejected(self):
        matrix = deepcopy(self.matrix)
        matrix["items"][1]["id"] = matrix["items"][0]["id"]
        self.assertTrue(audit(matrix)[0])

    def test_missing_category_is_rejected(self):
        matrix = deepcopy(self.matrix)
        matrix["items"] = [r for r in matrix["items"] if r["category"] != "approval"]
        self.assertTrue(audit(matrix)[0])

    def test_pass_without_evidence_is_rejected(self):
        matrix = deepcopy(self.matrix)
        row = next(r for r in matrix["items"] if r["status"] == "PASS")
        row["evidence"] = []
        self.assertTrue(audit(matrix)[0])

    def test_fake_technical_ready_is_rejected(self):
        matrix = deepcopy(self.matrix)
        matrix["technical_ready"] = True
        self.assertTrue(audit(matrix)[0])

    def test_fake_release_ready_is_rejected(self):
        matrix = deepcopy(self.matrix)
        matrix["release_ready"] = True
        self.assertTrue(audit(matrix)[0])

    def test_deferred_technical_gate_is_rejected(self):
        matrix = deepcopy(self.matrix)
        row = next(r for r in matrix["items"] if r["phase"] == "technical" and r["status"] != "PASS")
        row["status"] = "DEFERRED"
        self.assertTrue(audit(matrix)[0])

    def test_open_gate_requires_next_action(self):
        matrix = deepcopy(self.matrix)
        row = next(r for r in matrix["items"] if r["status"] == "OPEN")
        row["next_action"] = ""
        self.assertTrue(audit(matrix)[0])


if __name__ == "__main__":
    unittest.main()
