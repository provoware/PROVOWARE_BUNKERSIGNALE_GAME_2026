from pathlib import Path
import subprocess, textwrap, unittest

ROOT = Path(__file__).resolve().parents[1]

class I12Ed25519SignVerifyTests(unittest.TestCase):
    def test_known_rfc8032_vector_and_fail_closed_verify(self):
        script = textwrap.dedent(r"""
            import assert from "node:assert/strict";
            import { webcrypto } from "node:crypto";
            import {
              exportEd25519PublicKey,
              generateEd25519KeyPair,
              importEd25519PublicKey,
              signEd25519,
              verifyEd25519,
            } from "./app/infrastructure/browser/ed25519-sign-verify.js";
            const generated = await generateEd25519KeyPair(webcrypto.subtle);
            assert.equal(generated.privateKey.extractable, false);
            assert.deepEqual(generated.privateKey.usages, ["sign"]);
            assert.deepEqual(generated.publicKey.usages, ["verify"]);
            assert.equal((await exportEd25519PublicKey(generated.publicKey, webcrypto.subtle)).length, 32);
            const hex = value => Uint8Array.from(Buffer.from(value, "hex"));
            const rawPublic = hex("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a");
            const privateKey = await webcrypto.subtle.importKey("pkcs8", hex("302e020100300506032b6570042204209d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60"), {name:"Ed25519"}, false, ["sign"]);
            const publicKey = await importEd25519PublicKey(rawPublic, webcrypto.subtle);
            assert.equal(publicKey.extractable, true);
            assert.deepEqual(publicKey.usages, ["verify"]);
            assert.deepEqual(await exportEd25519PublicKey(publicKey, webcrypto.subtle), rawPublic);
            await assert.rejects(() => importEd25519PublicKey(rawPublic.slice(0, 31), webcrypto.subtle), /public key import failed/);
            await assert.rejects(() => exportEd25519PublicKey(privateKey, webcrypto.subtle), /public key export failed/);
            const message = new Uint8Array();
            const expected = hex("e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b");
            const signature = await signEd25519(message, privateKey, webcrypto.subtle);
            assert.deepEqual(signature, expected);
            assert.equal(await verifyEd25519(message, expected, publicKey, webcrypto.subtle), true);
            const changed = expected.slice(); changed[0] ^= 1;
            assert.equal(await verifyEd25519(message, changed, publicKey, webcrypto.subtle), false);
            assert.equal(await verifyEd25519(message, expected, publicKey, null), false);
        """)
        result = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_adapter_has_no_persistence_dependency(self):
        source = (ROOT / "app/infrastructure/browser/ed25519-sign-verify.js").read_text(encoding="utf-8")
        for forbidden in ("indexedDB", "localStorage", "sessionStorage"):
            self.assertNotIn(forbidden, source)

if __name__ == "__main__":
    unittest.main()
