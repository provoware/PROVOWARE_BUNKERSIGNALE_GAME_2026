from pathlib import Path
import subprocess
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]


class I11BrowserSha256Tests(unittest.TestCase):
    def run_node(self, script: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(["node", "--input-type=module", "-e", textwrap.dedent(script)], cwd=ROOT, capture_output=True, text=True, check=False)

    def test_adapter_matches_frozen_i11_vector(self) -> None:
        result = self.run_node(r'''
            import assert from "node:assert/strict";
            import { webcrypto } from "node:crypto";
            import { createBrowserSha256Hex } from "./app/infrastructure/browser/sha256.js";
            import { buildHashChain } from "./app/application/hash-chain.js";
            import { canonicalJson } from "./app/application/world-backup.js";
            const event = {event_id:"event:000000000000000000000001",event_type:"test.event",payload:{},author_id:"actor:000000000000000000000001",sequence:1,lamport:0,ruleset_version:"1.0.0",metadata:{}};
            const encoder = new TextEncoder();
            const chain = await buildHashChain([event], {canonicalEventBytes: value => encoder.encode(canonicalJson(value)), sha256Hex: createBrowserSha256Hex(webcrypto.subtle)});
            assert.equal(chain[0].event_hash, "b583335b4025c08e3cd2c3ae9324edde696d05450ef2744b721e59fd20f6fc31");
        ''')
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_adapter_translates_capability_and_digest_failures(self) -> None:
        result = self.run_node(r'''
            import assert from "node:assert/strict";
            import { createBrowserSha256Hex } from "./app/infrastructure/browser/sha256.js";
            assert.throws(() => createBrowserSha256Hex(null), /capability unavailable/);
            const sha = createBrowserSha256Hex({digest: async () => { throw new Error("vendor detail"); }});
            await assert.rejects(() => sha(new Uint8Array([1])), /digest failed/);
            await assert.rejects(() => sha("not bytes"), /Uint8Array/);
        ''')
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
