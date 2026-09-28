from pathlib import Path
import subprocess
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "app/application/verified-local-signature-evidence.js"


class I12VerifiedLocalSignatureEvidenceTests(unittest.TestCase):
    def run_node(self, script):
        result = subprocess.run(
            ["node", "--input-type=module", "-e", textwrap.dedent(script)],
            cwd=ROOT, capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_success_trace_snapshot_and_non_forgeable_evidence(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import {
              readVerifiedLocalSignatureRecord,
              verifyLocalSignatureEvidence,
            } from "./app/application/verified-local-signature-evidence.js";

            const event = {event_id:"event:"+"1".repeat(24),author_id:"actor:"+"2".repeat(24)};
            const context = {
              worldId:"world:"+"3".repeat(24), event,
              chainEntry:{event_id:event.event_id,previous_hash:"4".repeat(64),event_hash:"5".repeat(64)},
              i11Verified:true,
            };
            const record = {
              format:"ssi-event-signature",format_version:1,world_id:context.worldId,
              event_id:event.event_id,author_id:event.author_id,key_id:"key:sha256:"+"6".repeat(64),
              algorithm:"Ed25519",signature:"A".repeat(86),
            };
            const trace = [];
            const publicKey = {type:"public"};
            const capabilities = {
              publicKeyStore:{readById:async keyId=>{
                trace.push("read:"+keyId);
                return {key_id:keyId,algorithm:"Ed25519",public_key_bytes:new Uint8Array(32)};
              }},
              importPublicKey:async bytes=>{trace.push("import:"+bytes.length); return publicKey;},
              verifySignature:async(bytes,signature,key)=>{
                trace.push("verify");
                assert.equal(signature, record.signature);
                assert.equal(key, publicKey);
                return true;
              },
              canonicalEventBytes:()=>{trace.push("canonical"); return new Uint8Array([1]);},
              sha256Hex:async()=>{trace.push("hash"); return context.chainEntry.event_hash;},
            };

            const evidence = await verifyLocalSignatureEvidence(record, context, capabilities);
            assert.deepEqual(trace, ["read:"+record.key_id,"import:32","canonical","hash","verify"]);
            assert.equal(Object.isFrozen(evidence), true);
            record.signature = "B".repeat(86);
            const snapshot = readVerifiedLocalSignatureRecord(evidence);
            assert.equal(Object.isFrozen(snapshot), true);
            assert.equal(snapshot.signature, "A".repeat(86));
            assert.deepEqual(Object.keys(snapshot).sort(), [
              "algorithm","author_id","event_id","format","format_version","key_id","signature","world_id",
            ]);

            for (const forged of [{...evidence}, structuredClone(evidence), JSON.parse(JSON.stringify(evidence)), {}]) {
              assert.throws(() => readVerifiedLocalSignatureRecord(forged), error =>
                error.code === "I12_LOCAL_SIGNATURE_EVIDENCE_INVALID");
            }
        ''')

    def test_lookup_import_and_verification_fail_closed(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import {
              LOCAL_SIGNATURE_EVIDENCE_ERROR as E,
              verifyLocalSignatureEvidence,
            } from "./app/application/verified-local-signature-evidence.js";

            const event = {event_id:"event:"+"1".repeat(24),author_id:"actor:"+"2".repeat(24)};
            const context = {worldId:"world:"+"3".repeat(24),event,chainEntry:{event_id:event.event_id,previous_hash:"4".repeat(64),event_hash:"5".repeat(64)},i11Verified:true};
            const record = {format:"ssi-event-signature",format_version:1,world_id:context.worldId,event_id:event.event_id,author_id:event.author_id,key_id:"key:sha256:"+"6".repeat(64),algorithm:"Ed25519",signature:"A".repeat(86)};
            const base = {
              publicKeyStore:{readById:async()=>({
                key_id:record.key_id,algorithm:"Ed25519",public_key_bytes:new Uint8Array(32),
              })},
              importPublicKey:async()=>({type:"public"}), verifySignature:async()=>true,
              canonicalEventBytes:()=>new Uint8Array([1]), sha256Hex:async()=>context.chainEntry.event_hash,
            };
            const rejects = (caps, code, rec=record, ctx=context) => assert.rejects(
              () => verifyLocalSignatureEvidence(rec, ctx, caps), error => error.code === code,
            );

            let laterCalls = 0;
            await rejects({...base,publicKeyStore:{readById:async()=>null},importPublicKey:async()=>{laterCalls++;}}, E.KEY_NOT_FOUND);
            assert.equal(laterCalls, 0);
            const storeError = new Error("P2 read failed");
            await assert.rejects(() => verifyLocalSignatureEvidence(record, context, {...base,publicKeyStore:{readById:async()=>{throw storeError;}}}), error => error === storeError);
            await rejects({...base,importPublicKey:async()=>{throw new Error("import");}}, E.KEY_IMPORT_FAILED);
            await rejects({...base,importPublicKey:async()=>null}, E.KEY_IMPORT_FAILED);
            await rejects({...base,publicKeyStore:{readById:async()=>({
              key_id:record.key_id,algorithm:"Ed25519",public_key_bytes:new Uint8Array(31),
            })}}, E.KEY_IMPORT_FAILED);
            await rejects({...base,verifySignature:async()=>false}, E.VERIFICATION_FAILED);
            await rejects({...base,verifySignature:async()=>{throw new Error("verify");}}, E.VERIFICATION_FAILED);
            await rejects({...base,verifySignature:async()=>1}, E.VERIFICATION_FAILED);
            await rejects(base, E.VERIFICATION_FAILED, {...record,signature:"B".repeat(86)});
            await rejects(base, E.VERIFICATION_FAILED, {...record,world_id:"world:"+"9".repeat(24)});
            await rejects(base, E.VERIFICATION_FAILED, {...record,author_id:"actor:"+"9".repeat(24)});
            await rejects(base, E.VERIFICATION_FAILED, record, {...context,i11Verified:false});
            await rejects(base, E.VERIFICATION_FAILED, record, {...context,chainEntry:{...context.chainEntry,event_hash:"9".repeat(64)}});
        ''')

    def test_real_crypto_rejects_wrong_key_and_valid_tampered_signature(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import { webcrypto } from "node:crypto";
            import { deriveKeyId, signEventDetached } from "./app/application/event-signature.js";
            import { frameHashInput } from "./app/application/hash-chain.js";
            import { verifyLocalSignatureEvidence } from "./app/application/verified-local-signature-evidence.js";
            import { importEd25519PublicKey, signEd25519, verifyEd25519 } from "./app/infrastructure/browser/ed25519-sign-verify.js";
            import { createBrowserSha256Hex } from "./app/infrastructure/browser/sha256.js";

            const subtle = webcrypto.subtle;
            const sha256Hex = createBrowserSha256Hex(subtle);
            const encoder = new TextEncoder();
            const canonicalEventBytes = event => encoder.encode(JSON.stringify(event));
            const signingPair = await subtle.generateKey("Ed25519", true, ["sign", "verify"]);
            const wrongPair = await subtle.generateKey("Ed25519", true, ["sign", "verify"]);
            const signingBytes = new Uint8Array(await subtle.exportKey("raw", signingPair.publicKey));
            const wrongBytes = new Uint8Array(await subtle.exportKey("raw", wrongPair.publicKey));
            const keyId = await deriveKeyId(signingBytes, {sha256Hex});
            const event = {event_id:"event:"+"1".repeat(24),author_id:"actor:"+"2".repeat(24)};
            const eventBytes = canonicalEventBytes(event);
            const previousHash = "4".repeat(64);
            const context = {
              worldId:"world:"+"3".repeat(24), event,
              chainEntry:{event_id:event.event_id,previous_hash:previousHash,event_hash:await sha256Hex(frameHashInput(previousHash, eventBytes))},
              i11Verified:true,
            };
            const record = await signEventDetached({...context,keyId}, {
              signBytes: async bytes => Buffer.from(await signEd25519(bytes, signingPair.privateKey, subtle)).toString("base64url"),
              canonicalEventBytes, sha256Hex,
            });
            const capabilities = publicKeyBytes => ({
              publicKeyStore:{readById:async()=>({key_id:keyId,algorithm:"Ed25519",public_key_bytes:publicKeyBytes})},
              importPublicKey:bytes=>importEd25519PublicKey(bytes, subtle),
              verifySignature:(bytes,signature,key)=>verifyEd25519(bytes, Buffer.from(signature, "base64url"), key, subtle),
              canonicalEventBytes, sha256Hex,
            });

            await verifyLocalSignatureEvidence(record, context, capabilities(signingBytes));
            await assert.rejects(
              () => verifyLocalSignatureEvidence(record, context, capabilities(wrongBytes)),
              error => error.code === "I12_LOCAL_SIGNATURE_VERIFICATION_FAILED",
            );
            const signature = Buffer.from(record.signature, "base64url");
            signature[0] ^= 1;
            const tampered = {...record,signature:signature.toString("base64url")};
            assert.equal(tampered.signature.length, record.signature.length);
            await assert.rejects(
              () => verifyLocalSignatureEvidence(tampered, context, capabilities(signingBytes)),
              error => error.code === "I12_LOCAL_SIGNATURE_VERIFICATION_FAILED",
            );
        ''')

    def test_exact_surfaces_and_invalid_record_shape(self):
        self.run_node(r'''
            import assert from "node:assert/strict";
            import { LOCAL_SIGNATURE_EVIDENCE_ERROR as E, verifyLocalSignatureEvidence } from "./app/application/verified-local-signature-evidence.js";
            const event={event_id:"event:"+"1".repeat(24),author_id:"actor:"+"2".repeat(24)};
            const context={worldId:"world:"+"3".repeat(24),event,chainEntry:{},i11Verified:true};
            const record={format:"ssi-event-signature",format_version:1,world_id:context.worldId,event_id:event.event_id,author_id:event.author_id,key_id:"key:sha256:"+"6".repeat(64),algorithm:"Ed25519",signature:"A".repeat(86)};
            const caps={publicKeyStore:{readById:async()=>null},importPublicKey:async()=>({}),verifySignature:async()=>true,canonicalEventBytes:()=>new Uint8Array(),sha256Hex:async()=>"0".repeat(64)};
            const rejects=(rec,ctx,cap,code)=>assert.rejects(()=>verifyLocalSignatureEvidence(rec,ctx,cap),error=>error.code===code);
            await rejects(record,{...context,publicKey:{}},caps,E.CONTEXT_INVALID);
            await rejects({...record,verified:true},context,caps,E.CONTEXT_INVALID);
            await rejects(record,context,{...caps,publicKey:{}},E.CAPABILITY_INVALID);
            await rejects(record,context,{...caps,signatureStore:{}},E.CAPABILITY_INVALID);
            const {verifySignature,...missing}=caps;
            await rejects(record,context,missing,E.CAPABILITY_INVALID);
            await rejects(record,context,{...caps,publicKeyStore:{}},E.CAPABILITY_INVALID);
        ''')

    def test_module_has_no_persistence_or_signing_surface(self):
        source = MODULE.read_text(encoding="utf-8")
        for forbidden in (
            "indexedDB", "localStorage", "sessionStorage", "signatureStore",
            "persistSignature", "saveSignature", "putSignature", "signBytes",
            "privateKey", "window.", "document.",
        ):
            self.assertNotIn(forbidden, source)


if __name__ == "__main__":
    unittest.main()
