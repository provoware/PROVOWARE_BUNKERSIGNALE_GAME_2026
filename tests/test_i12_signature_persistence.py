from pathlib import Path
import subprocess
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]


class I12SignaturePersistenceTests(unittest.TestCase):
    def run_node(self, script):
        result = subprocess.run(
            ["node", "--input-type=module", "-e", textwrap.dedent(script)],
            cwd=ROOT, capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_genuine_evidence_is_the_only_write_source(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import { readVerifiedLocalSignatureRecord, verifyLocalSignatureEvidence } from "./app/application/verified-local-signature-evidence.js";
            import { persistVerifiedLocalSignatureEvidence } from "./app/application/persist-verified-signature.js";

            const event={event_id:"event:"+"2".repeat(24),author_id:"actor:"+"3".repeat(24)};
            const context={worldId:"world:"+"1".repeat(24),event,chainEntry:{event_id:event.event_id,previous_hash:"5".repeat(64),event_hash:"6".repeat(64)},i11Verified:true};
            const record = Object.freeze({format:"ssi-event-signature",format_version:1,world_id:context.worldId,event_id:event.event_id,author_id:event.author_id,key_id:"key:sha256:"+"4".repeat(64),algorithm:"Ed25519",signature:"A".repeat(86)});
            const evidence = await verifyLocalSignatureEvidence(record,context,{
              publicKeyStore:{readById:async()=>({key_id:record.key_id,algorithm:"Ed25519",public_key_bytes:new Uint8Array(32)})},
              importPublicKey:async()=>({type:"public"}),verifySignature:async()=>true,
              canonicalEventBytes:()=>new Uint8Array([1]),sha256Hex:async()=>context.chainEntry.event_hash,
            });
            const trace = [];
            const store = {putIfAbsent:async value=>{trace.push("put"); assert.deepEqual(value, record);}};
            await persistVerifiedLocalSignatureEvidence(evidence, {readVerifiedLocalSignatureRecord:value=>{trace.push("read");return readVerifiedLocalSignatureRecord(value);},signatureStore:store});
            assert.deepEqual(trace,["read","put"]);

            let writes=0;
            const realReader = value => readVerifiedLocalSignatureRecord(value);
            for (const forged of [{verified:true,record},{},structuredClone({})]) {
              await assert.rejects(
                ()=>persistVerifiedLocalSignatureEvidence(forged,{readVerifiedLocalSignatureRecord:realReader,signatureStore:{putIfAbsent:async()=>{writes++;}}}),
                error=>error.code==="I12_LOCAL_SIGNATURE_EVIDENCE_INVALID",
              );
            }
            assert.equal(writes,0);
        ''')

    def test_capability_and_store_failures_are_fail_closed(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import { SIGNATURE_PERSISTENCE_ERROR as E, persistVerifiedLocalSignatureEvidence } from "./app/application/persist-verified-signature.js";
            const reader=()=>({});
            const store={putIfAbsent:async()=>{throw new Error("write failed");}};
            const rejects=(caps,code)=>assert.rejects(()=>persistVerifiedLocalSignatureEvidence({},caps),error=>error.code===code);
            await rejects({readVerifiedLocalSignatureRecord:reader,signatureStore:store,signBytes:()=>{}},E.CAPABILITY_INVALID);
            await rejects({readVerifiedLocalSignatureRecord:reader,signatureStore:{}},E.CAPABILITY_INVALID);
            await rejects({readVerifiedLocalSignatureRecord:reader,signatureStore:store},E.FAILED);
        ''')

    def test_application_module_has_no_bypass_surface(self):
        source = (ROOT / "app/application/persist-verified-signature.js").read_text(encoding="utf-8")
        for forbidden in ("indexedDB", "localStorage", "verified: true", "signBytes", "privateKey"):
            self.assertNotIn(forbidden, source)


if __name__ == "__main__":
    unittest.main()
