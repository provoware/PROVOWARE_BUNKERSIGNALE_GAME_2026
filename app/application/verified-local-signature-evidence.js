import {
  validateEventSignatureRecord,
  verifyEventDetached,
} from "./event-signature.js";

const CONTEXT_KEYS = Object.freeze(["chainEntry", "event", "i11Verified", "worldId"]);
const CAPABILITY_KEYS = Object.freeze([
  "canonicalEventBytes",
  "importPublicKey",
  "publicKeyStore",
  "sha256Hex",
  "verifySignature",
]);
const issuedEvidence = new WeakMap();

export const LOCAL_SIGNATURE_EVIDENCE_ERROR = Object.freeze({
  CONTEXT_INVALID: "I12_LOCAL_SIGNATURE_EVIDENCE_CONTEXT_INVALID",
  CAPABILITY_INVALID: "I12_LOCAL_SIGNATURE_EVIDENCE_CAPABILITY_INVALID",
  KEY_NOT_FOUND: "I12_LOCAL_SIGNATURE_KEY_NOT_FOUND",
  KEY_IMPORT_FAILED: "I12_LOCAL_SIGNATURE_KEY_IMPORT_FAILED",
  VERIFICATION_FAILED: "I12_LOCAL_SIGNATURE_VERIFICATION_FAILED",
  EVIDENCE_INVALID: "I12_LOCAL_SIGNATURE_EVIDENCE_INVALID",
});

export class LocalSignatureEvidenceError extends Error {
  constructor(code, message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = "LocalSignatureEvidenceError";
    this.code = code;
  }
}

function sameKeys(value, expected) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function assertInputs(record, context, capabilities) {
  if (!sameKeys(context, CONTEXT_KEYS)) {
    throw new LocalSignatureEvidenceError(
      LOCAL_SIGNATURE_EVIDENCE_ERROR.CONTEXT_INVALID,
      "Local signature evidence context is invalid",
    );
  }
  try {
    if (!validateEventSignatureRecord(record, context)) return;
  } catch (error) {
    throw new LocalSignatureEvidenceError(
      LOCAL_SIGNATURE_EVIDENCE_ERROR.CONTEXT_INVALID,
      "Local signature record surface is invalid",
      error,
    );
  }
  if (!sameKeys(capabilities, CAPABILITY_KEYS)
    || typeof capabilities.publicKeyStore?.readById !== "function"
    || typeof capabilities.importPublicKey !== "function"
    || typeof capabilities.verifySignature !== "function"
    || typeof capabilities.canonicalEventBytes !== "function"
    || typeof capabilities.sha256Hex !== "function") {
    throw new LocalSignatureEvidenceError(
      LOCAL_SIGNATURE_EVIDENCE_ERROR.CAPABILITY_INVALID,
      "Local signature evidence capabilities are invalid",
    );
  }
}

function verificationFailed(cause = null) {
  return new LocalSignatureEvidenceError(
    LOCAL_SIGNATURE_EVIDENCE_ERROR.VERIFICATION_FAILED,
    "Local signature verification failed",
    cause,
  );
}

export async function verifyLocalSignatureEvidence(record, context, capabilities) {
  assertInputs(record, context, capabilities);
  if (!validateEventSignatureRecord(record, context)) throw verificationFailed();

  const publicKeyRecord = await capabilities.publicKeyStore.readById(record.key_id);
  if (publicKeyRecord === null) {
    throw new LocalSignatureEvidenceError(
      LOCAL_SIGNATURE_EVIDENCE_ERROR.KEY_NOT_FOUND,
      "Local signature public key was not found",
    );
  }

  let publicKey;
  try {
    if (publicKeyRecord?.key_id !== record.key_id
      || publicKeyRecord.algorithm !== "Ed25519"
      || !(publicKeyRecord.public_key_bytes instanceof Uint8Array)
      || publicKeyRecord.public_key_bytes.length !== 32) {
      throw new TypeError("Historical public key record is unusable");
    }
    publicKey = await capabilities.importPublicKey(publicKeyRecord.public_key_bytes);
    if (publicKey === null || (typeof publicKey !== "object" && typeof publicKey !== "function")) {
      throw new TypeError("Imported public key is unusable");
    }
  } catch (error) {
    throw new LocalSignatureEvidenceError(
      LOCAL_SIGNATURE_EVIDENCE_ERROR.KEY_IMPORT_FAILED,
      "Local signature public key import failed",
      error,
    );
  }

  let verified;
  try {
    verified = await verifyEventDetached(record, context, {
      canonicalEventBytes: capabilities.canonicalEventBytes,
      sha256Hex: capabilities.sha256Hex,
      verifyBytes: (bytes, signature, keyId) => {
        if (keyId !== record.key_id) throw new TypeError("Verification key_id mismatch");
        return capabilities.verifySignature(bytes, signature, publicKey);
      },
    });
  } catch (error) {
    throw verificationFailed(error);
  }
  if (verified !== true) throw verificationFailed();

  const snapshot = Object.freeze({ ...record });
  const evidence = Object.freeze({});
  issuedEvidence.set(evidence, snapshot);
  return evidence;
}

export function readVerifiedLocalSignatureRecord(evidence) {
  if ((typeof evidence !== "object" && typeof evidence !== "function")
    || evidence === null
    || !issuedEvidence.has(evidence)) {
    throw new LocalSignatureEvidenceError(
      LOCAL_SIGNATURE_EVIDENCE_ERROR.EVIDENCE_INVALID,
      "Verified local signature evidence is invalid",
    );
  }
  return issuedEvidence.get(evidence);
}
