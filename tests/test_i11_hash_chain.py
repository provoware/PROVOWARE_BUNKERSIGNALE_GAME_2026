from __future__ import annotations

from pathlib import Path
import subprocess
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]
CORE = ROOT / "app/application/hash-chain.js"


class I11HashChainTests(unittest.TestCase):
    def test_fixed_vector_and_fail_closed_verification(self) -> None:
        script = textwrap.dedent(r"""
            import assert from "node:assert/strict";
            import { createHash } from "node:crypto";
            import { buildHashChain, frameHashInput, verifyHashChain, GENESIS_HASH } from "./app/application/hash-chain.js";
            import { canonicalJson } from "./app/application/world-backup.js";

            const encoder = new TextEncoder();
            const event = {
              event_id: "event:000000000000000000000001", event_type: "test.event", payload: {},
              author_id: "actor:000000000000000000000001", sequence: 1, lamport: 0,
              ruleset_version: "1.0.0", metadata: {},
            };
            const canonicalEventBytes = value => encoder.encode(canonicalJson(value));
            const sha256Hex = async bytes => createHash("sha256").update(bytes).digest("hex");
            const framed = frameHashInput(GENESIS_HASH, canonicalEventBytes(event));
            assert.equal(Buffer.from(framed).toString("hex"), "70726f766f776172653a6931313a686173682d636861696e3a76310a303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030300a7b22617574686f725f6964223a226163746f723a303030303030303030303030303030303030303030303031222c226576656e745f6964223a226576656e743a303030303030303030303030303030303030303030303031222c226576656e745f74797065223a22746573742e6576656e74222c226c616d706f7274223a302c226d65746164617461223a7b7d2c227061796c6f6164223a7b7d2c2272756c657365745f76657273696f6e223a22312e302e30222c2273657175656e6365223a317d");
            const chain = await buildHashChain([event], { canonicalEventBytes, sha256Hex });
            assert.equal(chain[0].event_hash, "b583335b4025c08e3cd2c3ae9324edde696d05450ef2744b721e59fd20f6fc31");
            assert.equal(await verifyHashChain([event], chain, { canonicalEventBytes, sha256Hex }), true);
            assert.equal(await verifyHashChain([{...event, payload: {changed: true}}], chain, { canonicalEventBytes, sha256Hex }), false);
            assert.equal(await verifyHashChain([event], [{...chain[0], previous_hash: "1".repeat(64)}], { canonicalEventBytes, sha256Hex }), false);
            assert.deepEqual(await buildHashChain([], { canonicalEventBytes, sha256Hex }), []);
        """)
        result = subprocess.run(
            ["node", "--input-type=module", "-e", script], cwd=ROOT,
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_core_has_no_browser_or_persistence_dependency(self) -> None:
        source = CORE.read_text(encoding="utf-8")
        for forbidden in ("indexedDB", "localStorage", "sessionStorage", "window.", "document.", "crypto.subtle"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, source)
        self.assertIn("provoware:i11:hash-chain:v1\\n", source)
        self.assertIn('"0".repeat(64)', source)


if __name__ == "__main__":
    unittest.main()
