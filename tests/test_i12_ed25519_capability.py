from pathlib import Path
import subprocess
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]


class I12Ed25519CapabilityTests(unittest.TestCase):
    def test_detection_is_stable_and_fail_closed(self) -> None:
        script = textwrap.dedent(r"""
            import assert from "node:assert/strict";
            import { detectBrowserEd25519 } from "./app/infrastructure/browser/ed25519-capability.js";
            assert.equal(await detectBrowserEd25519(null), "unsupported");
            assert.equal(await detectBrowserEd25519({generateKey: async () => { throw new DOMException("no", "NotSupportedError"); }}), "unsupported");
            let options;
            const subtle = {generateKey: async (algorithm, extractable, usages) => {
              options = {algorithm, extractable, usages};
              return {privateKey:{}, publicKey:{}};
            }};
            assert.equal(await detectBrowserEd25519(subtle), "supported");
            assert.deepEqual(options, {algorithm:{name:"Ed25519"}, extractable:false, usages:["sign","verify"]});
        """)
        result = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
