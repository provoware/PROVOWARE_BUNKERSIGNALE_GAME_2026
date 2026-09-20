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
