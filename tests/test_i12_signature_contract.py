from __future__ import annotations

from pathlib import Path
import subprocess
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]
CORE = ROOT / "app/application/event-signature.js"


class I12SignatureContractTests(unittest.TestCase):
    def run_node(self, script: str) -> None:
        result = subprocess.run(["node", "--input-type=module", "-e", textwrap.dedent(script)], cwd=ROOT, capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_fixed_vectors_and_record_binding(self) -> None:
        self.run_node(r"""
            import assert from "node:assert/strict";
            import { createHash } from "node:crypto";
            import { createEventSignatureRecord, deriveKeyId, frameEventSignatureInput, validateEventSignatureRecord } from "./app/application/event-signature.js";
            import { canonicalJson } from "./app/application/world-backup.js";
            const encoder = new TextEncoder();
            const event = { event_id:"event:000000000000000000000001", event_type:"test.event", payload:{}, author_id:"actor:000000000000000000000001", sequence:1, lamport:0, ruleset_version:"1.0.0", metadata:{} };
            const worldId = "world:000000000000000000000001";
            const previousHash = "0".repeat(64);
            const eventHash = "b583335b4025c08e3cd2c3ae9324edde696d05450ef2744b721e59fd20f6fc31";
            const eventBytes = encoder.encode(canonicalJson(event));
            const sha256Hex = async bytes => createHash("sha256").update(bytes).digest("hex");
            const framed = frameEventSignatureInput({ worldId, previousHash, eventHash, eventBytes });
            assert.equal(createHash("sha256").update(framed).digest("hex"), "38aea67e517ee1458df28c0b6a73b2aa51c812e9baafb862ac9656b75d78a4a1");
            const keyId = await deriveKeyId(Uint8Array.from({length:32}, (_, i) => i), { sha256Hex });
            assert.equal(keyId, "key:sha256:ceb5f9a1d844ca3caef169e8d22b9f39875346044fe2d040131414fba6350a64");
            const record = createEventSignatureRecord({ worldId, event, keyId, signature:"A".repeat(86) });
            assert.equal(validateEventSignatureRecord(record, { worldId, event }), true);
            assert.equal(validateEventSignatureRecord({...record, author_id:"actor:000000000000000000000002"}, {worldId,event}), false);
            assert.equal(validateEventSignatureRecord({...record, signature:"A".repeat(85)+"B"}, {worldId,event}), false);
            await assert.rejects(() => deriveKeyId(new Uint8Array(31), {sha256Hex}), /exactly 32/);
            await assert.rejects(() => deriveKeyId(new Uint8Array(33), {sha256Hex}), /exactly 32/);
        """)

    def test_detached_orchestration_requires_i11_and_fails_closed(self) -> None:
        self.run_node(r"""
            import assert from "node:assert/strict";
            import { createHash } from "node:crypto";
            import { signEventDetached, verifyEventDetached } from "./app/application/event-signature.js";
            import { frameHashInput } from "./app/application/hash-chain.js";
            import { canonicalJson } from "./app/application/world-backup.js";
            const encoder = new TextEncoder();
            const event = {
              event_id:"event:000000000000000000000001", event_type:"test.event", payload:{},
              author_id:"actor:000000000000000000000001", sequence:1, lamport:0,
              ruleset_version:"1.0.0", metadata:{},
            };
            const canonicalEventBytes = value => encoder.encode(canonicalJson(value));
            const sha256Hex = async bytes => createHash("sha256").update(bytes).digest("hex");
            const previousHash = "0".repeat(64);
            const eventHash = await sha256Hex(frameHashInput(previousHash, canonicalEventBytes(event)));
            const context = {
              worldId:"world:000000000000000000000001", event,
              chainEntry:{event_id:event.event_id, previous_hash:previousHash, event_hash:eventHash},
              keyId:"key:sha256:"+"2".repeat(64), i11Verified:true,
            };
            const deps = { canonicalEventBytes, sha256Hex };
            let signedInput;
            const signBytes = async bytes => { signedInput = bytes; return "A".repeat(86); };
            const record = await signEventDetached(context, {signBytes, ...deps});
            assert.equal(record.event_id, event.event_id);
            assert.equal(await verifyEventDetached(record, context, {verifyBytes: async (bytes, signature, keyId) =>
              Buffer.from(bytes).equals(Buffer.from(signedInput)) && signature === record.signature && keyId === record.key_id, ...deps}), true);
            await assert.rejects(() => signEventDetached({...context, i11Verified:false}, {signBytes, ...deps}), /I11 verification/);
            assert.equal(await verifyEventDetached(record, {...context, i11Verified:false}, {verifyBytes:async()=>true, ...deps}), false);
            assert.equal(await verifyEventDetached(record, {...context, chainEntry:{...context.chainEntry, event_hash:"1".repeat(64)}}, {verifyBytes:async()=>true, ...deps}), false);
            const mutated = {...event, payload:{changed:true}};
            await assert.rejects(() => signEventDetached({...context, event:mutated}, {signBytes, ...deps}), /not bound to verified I11 entry/);
            assert.equal(await verifyEventDetached(record, {...context, event:mutated}, {verifyBytes:async()=>true, ...deps}), false);
            assert.equal(await verifyEventDetached({...record, author_id:"actor:000000000000000000000002"}, context, {verifyBytes:async()=>true, ...deps}), false);
            assert.equal(await verifyEventDetached({...record, signature:"A".repeat(85)+"B"}, context, {verifyBytes:async()=>true, ...deps}), false);
        """)

    def test_core_has_no_browser_or_persistence_dependency(self) -> None:
        source = CORE.read_text(encoding="utf-8")
        for forbidden in ("indexedDB", "localStorage", "sessionStorage", "window.", "document.", "crypto.subtle"):
            with self.subTest(forbidden=forbidden): self.assertNotIn(forbidden, source)
        self.assertIn("successful I11 verification is required", source)
        self.assertIn("signBytes", source)
        self.assertIn("verifyBytes", source)


if __name__ == "__main__":
    unittest.main()
