from __future__ import annotations

from pathlib import Path
import subprocess
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]
CORE = ROOT / "app/application/event-signature.js"


class I12SignatureContractTests(unittest.TestCase):
    def test_fixed_vectors_and_record_binding(self) -> None:
        script = textwrap.dedent(r"""
            import assert from "node:assert/strict";
            import { createHash } from "node:crypto";
            import {
              createEventSignatureRecord,
              deriveKeyId,
              frameEventSignatureInput,
              validateEventSignatureRecord,
            } from "./app/application/event-signature.js";
            import { canonicalJson } from "./app/application/world-backup.js";

            const encoder = new TextEncoder();
            const event = {
              event_id: "event:000000000000000000000001", event_type: "test.event", payload: {},
              author_id: "actor:000000000000000000000001", sequence: 1, lamport: 0,
              ruleset_version: "1.0.0", metadata: {},
            };
            const worldId = "world:000000000000000000000001";
            const previousHash = "0".repeat(64);
            const eventHash = "b583335b4025c08e3cd2c3ae9324edde696d05450ef2744b721e59fd20f6fc31";
            const eventBytes = encoder.encode(canonicalJson(event));
            const sha256Hex = async bytes => createHash("sha256").update(bytes).digest("hex");

            const framed = frameEventSignatureInput({ worldId, previousHash, eventHash, eventBytes });
            assert.equal(Buffer.from(framed).toString("hex"),
              "70726f766f776172653a6931323a6576656e742d7369676e61747572653a76310a776f726c643a3030303030303030303030303030303030303030303030310a303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030300a623538333333356234303235633038653363643263336165393332346564646536393664303534353065663237343462373231653539666432306636666333310a7b22617574686f725f6964223a226163746f723a303030303030303030303030303030303030303030303031222c226576656e745f6964223a226576656e743a303030303030303030303030303030303030303030303031222c226576656e745f74797065223a22746573742e6576656e74222c226c616d706f7274223a302c226d65746164617461223a7b7d2c227061796c6f6164223a7b7d2c2272756c657365745f76657273696f6e223a22312e302e30222c2273657175656e6365223a317d");
            assert.equal(createHash("sha256").update(framed).digest("hex"),
              "38aea67e517ee1458df28c0b6a73b2aa51c812e9baafb862ac9656b75d78a4a1");

            const publicKeyBytes = Uint8Array.from({ length: 32 }, (_, index) => index);
            const keyId = await deriveKeyId(publicKeyBytes, { sha256Hex });
            assert.equal(keyId, "key:sha256:ceb5f9a1d844ca3caef169e8d22b9f39875346044fe2d040131414fba6350a64");

            const signature = "A".repeat(86);
            const record = createEventSignatureRecord({ worldId, event, keyId, signature });
            assert.equal(validateEventSignatureRecord(record, { worldId, event }), true);
            assert.equal(validateEventSignatureRecord({ ...record, author_id: "actor:000000000000000000000002" }, { worldId, event }), false);
            assert.equal(validateEventSignatureRecord({ ...record, event_id: "event:000000000000000000000002" }, { worldId, event }), false);
            assert.equal(validateEventSignatureRecord({ ...record, world_id: "world:000000000000000000000002" }, { worldId, event }), false);
            assert.throws(() => frameEventSignatureInput({ worldId, previousHash: "A".repeat(64), eventHash, eventBytes }));
        """)
        result = subprocess.run(
            ["node", "--input-type=module", "-e", script],
            cwd=ROOT, capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_core_has_no_browser_or_persistence_dependency(self) -> None:
        source = CORE.read_text(encoding="utf-8")
        for forbidden in ("indexedDB", "localStorage", "sessionStorage", "window.", "document.", "crypto.subtle"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, source)
        self.assertIn("provoware:i12:event-signature:v1\\n", source)
        self.assertIn("provoware:i12:key-id:v1\\n", source)
        self.assertIn("key:sha256:", source)


if __name__ == "__main__":
    unittest.main()
