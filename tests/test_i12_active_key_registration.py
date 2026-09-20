from pathlib import Path
import subprocess, textwrap, unittest

ROOT = Path(__file__).resolve().parents[1]


class I12ActiveKeyRegistrationTests(unittest.TestCase):
    def run_node(self, script):
        result = subprocess.run(
            ["node", "--input-type=module", "-e", textwrap.dedent(script)],
            cwd=ROOT, capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_contract_barrier_and_fail_closed_paths(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import {
              ACTIVE_KEY_REGISTRATION_ERROR as E,
              ensureActiveSigningKeyRegistered,
            } from "./app/application/active-key-registration.js";

            const keyId = "key:sha256:" + "a".repeat(64);
            const bytes = Uint8Array.from({length:32}, (_, i) => i);
            const publicKey = {kind:"public"};
            const active = {key_id:keyId, public_key:publicKey, private_key:{kind:"private"}, slot:"active"};

            const make = ({
              record=active, exported=bytes, derived=keyId, registerError=null,
              exportError=null, deriveError=null,
            }={}) => {
              const trace = [];
              const deps = {
                signingKeyStore:{readActive:async()=>{trace.push("read"); return record;}},
                publicKeyStore:{putIfAbsent:async value=>{
                  trace.push("register");
                  if (registerError) throw registerError;
                  assert.equal(value.key_id, keyId);
                  assert.equal(value.algorithm, "Ed25519");
                  assert.deepEqual(value.public_key_bytes, bytes);
                }},
                exportPublicKey:async key=>{
                  trace.push("export");
                  assert.equal(key, publicKey);
                  if (exportError) throw exportError;
                  return exported;
                },
                deriveKeyId:async value=>{
                  trace.push("derive");
                  if (deriveError) throw deriveError;
                  assert.deepEqual(value, bytes);
                  return derived;
                },
              };
              return {trace,deps};
            };
            const code = async (deps, expected) => {
              await assert.rejects(
                () => ensureActiveSigningKeyRegistered(deps),
                error => error.code === expected,
              );
            };

            const ok = make();
            const result = await ensureActiveSigningKeyRegistered(ok.deps);
            assert.deepEqual(ok.trace, ["read","export","derive","register"]);
            assert.equal(result.key_id, keyId);
            assert.equal(Object.isFrozen(result), true);
            assert.deepEqual(result.public_key_bytes, bytes);
            result.public_key_bytes[0] ^= 255;
            assert.equal(bytes[0], 0);

            const existing = make();
            await ensureActiveSigningKeyRegistered(existing.deps);
            assert.deepEqual(existing.trace, ["read","export","derive","register"]);

            const missing = make({record:null});
            await code(missing.deps, E.MISSING);
            assert.deepEqual(missing.trace, ["read"]);

            const exportFail = make({exportError:new Error("export")});
            await code(exportFail.deps, E.EXPORT_FAILED);
            assert.deepEqual(exportFail.trace, ["read","export"]);

            const shortExport = make({exported:bytes.slice(0,31)});
            await code(shortExport.deps, E.EXPORT_FAILED);
            assert.deepEqual(shortExport.trace, ["read","export"]);

            const deriveFail = make({deriveError:new Error("derive")});
            await code(deriveFail.deps, E.ID_DERIVE_FAILED);
            assert.deepEqual(deriveFail.trace, ["read","export","derive"]);

            const malformed = make({derived:"bad"});
            await code(malformed.deps, E.ID_DERIVE_FAILED);
            assert.deepEqual(malformed.trace, ["read","export","derive"]);

            const mismatch = make({derived:"key:sha256:"+"b".repeat(64)});
            await code(mismatch.deps, E.ID_MISMATCH);
            assert.deepEqual(mismatch.trace, ["read","export","derive"]);

            const registerFail = make({registerError:new Error("conflict")});
            await code(registerFail.deps, E.REGISTRATION_FAILED);
            assert.deepEqual(registerFail.trace, ["read","export","derive","register"]);
        ''')

    def test_sign_capability_is_never_reached_before_successful_registration(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import {ensureActiveSigningKeyRegistered} from "./app/application/active-key-registration.js";

            const keyId = "key:sha256:" + "c".repeat(64);
            const bytes = new Uint8Array(32);
            const trace = [];
            let registered = false;
            const signBytes = async () => {
              trace.push("sign");
              assert.equal(registered, true, "sign reached before P2 success");
            };
            const deps = {
              signingKeyStore:{readActive:async()=>{trace.push("read"); return {key_id:keyId,public_key:{},private_key:{},slot:"active"};}},
              exportPublicKey:async()=>{trace.push("export"); return bytes;},
              deriveKeyId:async()=>{trace.push("derive"); return keyId;},
              publicKeyStore:{putIfAbsent:async()=>{trace.push("register"); registered=true;}},
            };

            await ensureActiveSigningKeyRegistered(deps);
            await signBytes();
            assert.deepEqual(trace, ["read","export","derive","register","sign"]);

            registered=false;
            trace.length=0;
            deps.publicKeyStore.putIfAbsent=async()=>{trace.push("register"); throw new Error("storage");};
            await assert.rejects(()=>ensureActiveSigningKeyRegistered(deps));
            assert.deepEqual(trace, ["read","export","derive","register"]);
            assert.equal(trace.includes("sign"), false);
        ''')

    def test_application_module_has_no_browser_persistence_or_sign_dependency(self):
        source = (ROOT / "app/application/active-key-registration.js").read_text(encoding="utf-8")
        for forbidden in ("indexedDB", "localStorage", "sessionStorage", "window.", "document.", "signEd25519", "signEventDetached"):
            self.assertNotIn(forbidden, source)


if __name__ == "__main__":
    unittest.main()
