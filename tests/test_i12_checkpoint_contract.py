from pathlib import Path
import subprocess, textwrap, unittest

ROOT = Path(__file__).resolve().parents[1]


class I12CheckpointContractTests(unittest.TestCase):
    def run_node(self, script):
        result = subprocess.run(
            ["node", "--input-type=module", "-e", textwrap.dedent(script)],
            cwd=ROOT, capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_fixed_vector_and_trusted_coverage_fail_closed(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import { createHash } from "node:crypto";
            import { buildHashChain } from "./app/application/hash-chain.js";
            import { canonicalJson } from "./app/application/world-backup.js";
            import {
              frameWorldCheckpointInput,
              validateWorldCheckpoint,
              verifyTrustedCheckpoint,
            } from "./app/application/world-checkpoint.js";

            const encoder = new TextEncoder();
            const sha256Hex = async bytes => createHash("sha256").update(bytes).digest("hex");
            const canonicalEventBytes = event => encoder.encode(canonicalJson(event));
            const worldId = "world:000000000000000000000001";
            const expectedKeyId = "key:sha256:" + "b".repeat(64);

            const fixed = frameWorldCheckpointInput({
              worldId,
              eventCount: 2,
              headEventId: "event:000000000000000000000002",
              headHash: "a".repeat(64),
            });
            assert.equal(
              createHash("sha256").update(fixed).digest("hex"),
              "c731ca003a7d2713150ce96d47bf50e1016b67b8b7d70887c3efc325f4951fac",
            );

            const events = [1, 2].map(sequence => ({
              event_id: "event:" + String(sequence).padStart(24, "0"),
              event_type: "test.event",
              payload: {sequence},
              author_id: "actor:000000000000000000000001",
              sequence,
              lamport: sequence,
              ruleset_version: "1.0.0",
              metadata: {},
            }));
            const chain = await buildHashChain(events, {canonicalEventBytes, sha256Hex});
            const record = {
              format: "ssi-world-checkpoint",
              format_version: 1,
              world_id: worldId,
              event_count: events.length,
              head_event_id: events.at(-1).event_id,
              head_hash: chain.at(-1).event_hash,
              key_id: expectedKeyId,
              algorithm: "Ed25519",
              signature: "A".repeat(86),
            };
            assert.equal(validateWorldCheckpoint(record), true);

            const signedInput = frameWorldCheckpointInput({
              worldId: record.world_id,
              eventCount: record.event_count,
              headEventId: record.head_event_id,
              headHash: record.head_hash,
            });
            const verifyBytes = async (bytes, signature, keyId) =>
              Buffer.from(bytes).equals(Buffer.from(signedInput)) &&
              signature === record.signature &&
              keyId === expectedKeyId;
            const context = {worldId, events, chain, expectedKeyId};
            const deps = {verifyBytes, canonicalEventBytes, sha256Hex};

            assert.equal(await verifyTrustedCheckpoint(record, context, deps), true);

            const truncated = { ...context, events: events.slice(0, 1), chain: chain.slice(0, 1) };
            assert.equal(await verifyTrustedCheckpoint(record, truncated, deps), false);

            const attackerKeyId = "key:sha256:" + "c".repeat(64);
            const attackerRecord = {...record, key_id: attackerKeyId};
            assert.equal(
              await verifyTrustedCheckpoint(attackerRecord, context, {
                ...deps,
                verifyBytes: async () => true,
              }),
              false,
            );

            const fakeChain = chain.map(item => ({...item}));
            fakeChain[1].event_hash = "d".repeat(64);
            assert.equal(
              await verifyTrustedCheckpoint(record, {...context, chain: fakeChain}, {
                ...deps,
                verifyBytes: async () => true,
              }),
              false,
            );

            assert.equal(
              await verifyTrustedCheckpoint({...record, signature:"A".repeat(85)+"B"}, context, deps),
              false,
            );
        ''')

    def test_core_has_no_browser_or_persistence_dependency(self):
        source = (ROOT / "app/application/world-checkpoint.js").read_text(encoding="utf-8")
        for forbidden in ("indexedDB", "localStorage", "sessionStorage", "window.", "document.", "crypto.subtle", "CryptoKey"):
            self.assertNotIn(forbidden, source)
        self.assertIn("expectedKeyId", source)
        self.assertIn("verifyHashChain", source)


if __name__ == "__main__":
    unittest.main()
