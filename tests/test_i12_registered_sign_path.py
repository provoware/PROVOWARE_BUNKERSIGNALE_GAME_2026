from pathlib import Path
import subprocess
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]


class I12RegisteredSignPathTests(unittest.TestCase):
    def run_node(self, script):
        result = subprocess.run(
            ["node", "--input-type=module", "-e", textwrap.dedent(script)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_success_uses_only_registered_key_and_exact_trace(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import {
              signEventWithRegisteredActiveKey,
            } from "./app/application/registered-event-signature.js";

            const keyId = "key:sha256:" + "a".repeat(64);
            const event = {
              event_id:"event:" + "1".repeat(24),
              author_id:"actor:" + "2".repeat(24),
            };
            const chainEntry = {
              event_id:event.event_id,
              previous_hash:"3".repeat(64),
              event_hash:"4".repeat(64),
            };
            const context = {
              worldId:"world:" + "5".repeat(24),
              event,
              chainEntry,
              i11Verified:true,
            };
            const bytes = Uint8Array.from({length:32}, (_, i) => i);
            const trace = [];
            let registered = false;

            const capabilities = {
              signingKeyStore:{
                readActive:async()=>{
                  trace.push("read");
                  return {slot:"active", key_id:keyId, public_key:{kind:"public"}, private_key:{kind:"private"}};
                },
              },
              publicKeyStore:{
                putIfAbsent:async record=>{
                  trace.push("register");
                  assert.equal(record.key_id, keyId);
                  registered = true;
                },
              },
              exportPublicKey:async()=>{
                trace.push("export");
                return bytes;
              },
              deriveKeyId:async()=>{
                trace.push("derive");
                return keyId;
              },
              signBytes:async()=>{
                trace.push("sign");
                assert.equal(registered, true);
                return "A".repeat(86);
              },
              canonicalEventBytes:()=>new Uint8Array([1,2,3]),
              sha256Hex:async()=>chainEntry.event_hash,
            };

            const record = await signEventWithRegisteredActiveKey(context, capabilities);
            assert.deepEqual(trace, ["read","export","derive","register","sign"]);
            assert.equal(record.key_id, keyId);
            assert.equal(record.world_id, context.worldId);
            assert.equal(record.event_id, event.event_id);
            assert.equal(record.author_id, event.author_id);
            assert.equal(record.format, "ssi-event-signature");
            assert.equal(Object.isFrozen(record), true);
        ''')

    def test_barrier_errors_never_reach_sign_and_pass_through(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import {
              ACTIVE_KEY_REGISTRATION_ERROR as A,
              ActiveKeyRegistrationError,
            } from "./app/application/active-key-registration.js";
            import {
              signEventWithRegisteredActiveKey,
            } from "./app/application/registered-event-signature.js";

            const keyId = "key:sha256:" + "a".repeat(64);
            const bytes = new Uint8Array(32);
            const context = {
              worldId:"world:" + "5".repeat(24),
              event:{event_id:"event:"+"1".repeat(24),author_id:"actor:"+"2".repeat(24)},
              chainEntry:{event_id:"event:"+"1".repeat(24),previous_hash:"3".repeat(64),event_hash:"4".repeat(64)},
              i11Verified:true,
            };

            const make = ({active=true, exportError=null, deriveError=null, derived=keyId, registerError=null}={}) => {
              let signCalls = 0;
              const capabilities = {
                signingKeyStore:{readActive:async()=>active ? {slot:"active",key_id:keyId,public_key:{},private_key:{}} : null},
                publicKeyStore:{putIfAbsent:async()=>{if(registerError) throw registerError;}},
                exportPublicKey:async()=>{if(exportError) throw exportError; return bytes;},
                deriveKeyId:async()=>{if(deriveError) throw deriveError; return derived;},
                signBytes:async()=>{signCalls += 1; return "A".repeat(86);},
                canonicalEventBytes:()=>new Uint8Array([1]),
                sha256Hex:async()=>context.chainEntry.event_hash,
              };
              return {capabilities, signCalls:()=>signCalls};
            };

            const cases = [
              [make({active:false}), A.MISSING],
              [make({exportError:new Error("export")}), A.EXPORT_FAILED],
              [make({deriveError:new Error("derive")}), A.ID_DERIVE_FAILED],
              [make({derived:"key:sha256:"+"b".repeat(64)}), A.ID_MISMATCH],
              [make({registerError:new Error("store")}), A.REGISTRATION_FAILED],
            ];

            for (const [fixture, code] of cases) {
              await assert.rejects(
                () => signEventWithRegisteredActiveKey(context, fixture.capabilities),
                error => error instanceof ActiveKeyRegistrationError && error.code === code,
              );
              assert.equal(fixture.signCalls(), 0);
            }
        ''')

    def test_context_and_capability_surface_are_fail_closed(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import {
              REGISTERED_SIGN_ERROR as E,
              signEventWithRegisteredActiveKey,
            } from "./app/application/registered-event-signature.js";

            const context = {
              worldId:"world:"+"5".repeat(24),
              event:{},
              chainEntry:{},
              i11Verified:true,
            };
            const capabilities = {
              signingKeyStore:{readActive:async()=>null},
              publicKeyStore:{putIfAbsent:async()=>{}},
              exportPublicKey:async()=>new Uint8Array(32),
              deriveKeyId:async()=>"key:sha256:"+"a".repeat(64),
              signBytes:async()=>"A".repeat(86),
              canonicalEventBytes:()=>new Uint8Array(),
              sha256Hex:async()=>"0".repeat(64),
            };
            const expectCode = async (fn, code) => {
              await assert.rejects(fn, error => error.code === code);
            };

            await expectCode(
              () => signEventWithRegisteredActiveKey({...context,keyId:"key:sha256:"+"a".repeat(64)}, capabilities),
              E.CONTEXT_INVALID,
            );
            await expectCode(
              () => signEventWithRegisteredActiveKey({worldId:context.worldId,event:{},chainEntry:{}}, capabilities),
              E.CONTEXT_INVALID,
            );
            await expectCode(
              () => signEventWithRegisteredActiveKey(context, {...capabilities,signatureStore:{put:async()=>{}}}),
              E.CAPABILITY_INVALID,
            );
            const {signBytes, ...missingSign} = capabilities;
            await expectCode(
              () => signEventWithRegisteredActiveKey(context, missingSign),
              E.CAPABILITY_INVALID,
            );
            await expectCode(
              () => signEventWithRegisteredActiveKey(context, {...capabilities,publicKeyStore:{}}),
              E.CAPABILITY_INVALID,
            );
        ''')

    def test_post_registration_sign_failure_has_stable_error(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import {
              REGISTERED_SIGN_ERROR as E,
              RegisteredSignError,
              signEventWithRegisteredActiveKey,
            } from "./app/application/registered-event-signature.js";

            const keyId = "key:sha256:" + "a".repeat(64);
            let registered = false;
            const context = {
              worldId:"world:"+"5".repeat(24),
              event:{event_id:"event:"+"1".repeat(24),author_id:"actor:"+"2".repeat(24)},
              chainEntry:{event_id:"event:"+"1".repeat(24),previous_hash:"3".repeat(64),event_hash:"4".repeat(64)},
              i11Verified:true,
            };
            const cause = new Error("sign failed");
            const capabilities = {
              signingKeyStore:{readActive:async()=>({slot:"active",key_id:keyId,public_key:{},private_key:{}})},
              publicKeyStore:{putIfAbsent:async()=>{registered=true;}},
              exportPublicKey:async()=>new Uint8Array(32),
              deriveKeyId:async()=>keyId,
              signBytes:async()=>{assert.equal(registered,true); throw cause;},
              canonicalEventBytes:()=>new Uint8Array([1]),
              sha256Hex:async()=>context.chainEntry.event_hash,
            };

            await assert.rejects(
              () => signEventWithRegisteredActiveKey(context, capabilities),
              error => error instanceof RegisteredSignError
                && error.code === E.SIGN_FAILED
                && error.cause === cause,
            );
        ''')

    def test_module_has_no_signature_persistence_surface(self):
        source = (ROOT / "app/application/registered-event-signature.js").read_text(encoding="utf-8")
        for forbidden in (
            "indexedDB", "localStorage", "sessionStorage", "signatureStore",
            "persistSignature", "saveSignature", "putSignature", "deleteSignature",
            "window.", "document.",
        ):
            self.assertNotIn(forbidden, source)


if __name__ == "__main__":
    unittest.main()
