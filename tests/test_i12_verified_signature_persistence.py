from pathlib import Path
import subprocess
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]


class I12VerifiedSignaturePersistenceTests(unittest.TestCase):
    def run_node(self, script):
        result = subprocess.run(
            ["node", "--input-type=module", "-e", textwrap.dedent(script)],
            cwd=ROOT, capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_only_genuine_evidence_reaches_store(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import { verifyLocalSignatureEvidence } from "./app/application/verified-local-signature-evidence.js";
            import {
              VERIFIED_SIGNATURE_PERSISTENCE_ERROR as E,
              persistVerifiedLocalSignature,
            } from "./app/application/verified-signature-persistence.js";

            const event={event_id:"event:"+"1".repeat(24),author_id:"actor:"+"2".repeat(24)};
            const context={worldId:"world:"+"3".repeat(24),event,chainEntry:{event_id:event.event_id,previous_hash:"4".repeat(64),event_hash:"5".repeat(64)},i11Verified:true};
            const record={format:"ssi-event-signature",format_version:1,world_id:context.worldId,event_id:event.event_id,author_id:event.author_id,key_id:"key:sha256:"+"6".repeat(64),algorithm:"Ed25519",signature:"A".repeat(86)};
            const verifyCapabilities={
              publicKeyStore:{readById:async()=>({key_id:record.key_id,algorithm:"Ed25519",public_key_bytes:new Uint8Array(32)})},
              importPublicKey:async()=>({type:"public"}),verifySignature:async()=>true,
              canonicalEventBytes:()=>new Uint8Array([1]),sha256Hex:async()=>context.chainEntry.event_hash,
            };
            const evidence=await verifyLocalSignatureEvidence(record,context,verifyCapabilities);
            const writes=[];
            const capabilities={signatureStore:{putIfAbsent:async value=>writes.push(value)}};
            const persisted=await persistVerifiedLocalSignature(evidence,capabilities);
            assert.equal(persisted,writes[0]);
            assert.equal(Object.isFrozen(persisted),true);
            assert.deepEqual(persisted,record);

            for (const forged of [{...evidence},structuredClone(evidence),JSON.parse(JSON.stringify(evidence)),{}]) {
              await assert.rejects(
                ()=>persistVerifiedLocalSignature(forged,capabilities),
                error=>error.code===E.EVIDENCE_INVALID,
              );
            }
            assert.equal(writes.length,1);
        ''')

    def test_exact_capability_and_storage_error_mapping(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import { verifyLocalSignatureEvidence } from "./app/application/verified-local-signature-evidence.js";
            import { VERIFIED_SIGNATURE_PERSISTENCE_ERROR as E,persistVerifiedLocalSignature } from "./app/application/verified-signature-persistence.js";
            const event={event_id:"event:"+"1".repeat(24),author_id:"actor:"+"2".repeat(24)};
            const context={worldId:"world:"+"3".repeat(24),event,chainEntry:{event_id:event.event_id,previous_hash:"4".repeat(64),event_hash:"5".repeat(64)},i11Verified:true};
            const record={format:"ssi-event-signature",format_version:1,world_id:context.worldId,event_id:event.event_id,author_id:event.author_id,key_id:"key:sha256:"+"6".repeat(64),algorithm:"Ed25519",signature:"A".repeat(86)};
            const evidence=await verifyLocalSignatureEvidence(record,context,{publicKeyStore:{readById:async()=>({key_id:record.key_id,algorithm:"Ed25519",public_key_bytes:new Uint8Array(32)})},importPublicKey:async()=>({}),verifySignature:async()=>true,canonicalEventBytes:()=>new Uint8Array(),sha256Hex:async()=>context.chainEntry.event_hash});
            const rejects=(caps,code)=>assert.rejects(()=>persistVerifiedLocalSignature(evidence,caps),error=>error.code===code);
            await rejects({},E.CAPABILITY_INVALID);
            await rejects({signatureStore:{}},E.CAPABILITY_INVALID);
            await rejects({signatureStore:{putIfAbsent:async()=>{}},publicKeyStore:{}},E.CAPABILITY_INVALID);
            const failure=new Error("write failed");
            await assert.rejects(
              ()=>persistVerifiedLocalSignature(evidence,{signatureStore:{putIfAbsent:async()=>{throw failure;}}}),
              error=>error.code===E.PERSIST_FAILED && error.cause===failure,
            );
        ''')

    def test_application_has_no_browser_or_key_capability(self):
        source = (ROOT / "app/application/verified-signature-persistence.js").read_text()
        for forbidden in ("indexedDB", "CryptoKey", "privateKey", "signBytes", "publicKeyStore"):
            self.assertNotIn(forbidden, source)


if __name__ == "__main__":
    unittest.main()
