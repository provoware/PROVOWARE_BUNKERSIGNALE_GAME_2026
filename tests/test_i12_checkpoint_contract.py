from pathlib import Path
import subprocess, textwrap, unittest

ROOT = Path(__file__).resolve().parents[1]

class I12CheckpointContractTests(unittest.TestCase):
    def run_node(self, script):
        result = subprocess.run(["node", "--input-type=module", "-e", textwrap.dedent(script)], cwd=ROOT, capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_fixed_vector_and_suffix_truncation_fail_closed(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import { createHash } from "node:crypto";
            import { frameWorldCheckpointInput, validateWorldCheckpoint, verifyTrustedCheckpoint } from "./app/application/world-checkpoint.js";
            const record = {
              format:"ssi-world-checkpoint", format_version:1, world_id:"world:000000000000000000000001",
              event_count:2, head_event_id:"event:000000000000000000000002", head_hash:"a".repeat(64),
              key_id:"key:sha256:"+"b".repeat(64), algorithm:"Ed25519", signature:"A".repeat(86),
            };
            const input = frameWorldCheckpointInput({worldId:record.world_id,eventCount:record.event_count,headEventId:record.head_event_id,headHash:record.head_hash});
            assert.equal(createHash("sha256").update(input).digest("hex"), "c731ca003a7d2713150ce96d47bf50e1016b67b8b7d70887c3efc325f4951fac");
            assert.equal(validateWorldCheckpoint(record), true);
            const verifyBytes = async (bytes, signature, keyId) => Buffer.from(bytes).equals(Buffer.from(input)) && signature === record.signature && keyId === record.key_id;
            const complete = {worldId:record.world_id,eventCount:2,headEventId:record.head_event_id,headHash:record.head_hash};
            assert.equal(await verifyTrustedCheckpoint(record, complete, {verifyBytes}), true);
            const truncated = {worldId:record.world_id,eventCount:1,headEventId:"event:000000000000000000000001",headHash:"c".repeat(64)};
            assert.equal(await verifyTrustedCheckpoint(record, truncated, {verifyBytes}), false);
            assert.equal(await verifyTrustedCheckpoint({...record, world_id:"world:000000000000000000000002"}, complete, {verifyBytes}), false);
            assert.equal(await verifyTrustedCheckpoint({...record, signature:"A".repeat(85)+"B"}, complete, {verifyBytes}), false);
        ''')

    def test_core_has_no_browser_or_persistence_dependency(self):
        source = (ROOT / "app/application/world-checkpoint.js").read_text(encoding="utf-8")
        for forbidden in ("indexedDB", "localStorage", "sessionStorage", "window.", "document.", "crypto.subtle", "CryptoKey"):
            self.assertNotIn(forbidden, source)

if __name__ == "__main__":
    unittest.main()
