import {
  LOCAL_SIGNATURE_EVIDENCE_ERROR,
  readVerifiedLocalSignatureRecord,
} from "./verified-local-signature-evidence.js";

export const VERIFIED_SIGNATURE_PERSISTENCE_ERROR = Object.freeze({
  EVIDENCE_INVALID: "I12_VERIFIED_SIGNATURE_EVIDENCE_INVALID",
  CAPABILITY_INVALID: "I12_VERIFIED_SIGNATURE_CAPABILITY_INVALID",
  PERSIST_FAILED: "I12_VERIFIED_SIGNATURE_PERSIST_FAILED",
});

export class VerifiedSignaturePersistenceError extends Error {
  constructor(code, message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = "VerifiedSignaturePersistenceError";
    this.code = code;
  }
}

export async function persistVerifiedLocalSignature(evidence, capabilities) {
  if (capabilities === null || typeof capabilities !== "object" || Array.isArray(capabilities)
    || Object.keys(capabilities).join(",") !== "signatureStore"
    || typeof capabilities.signatureStore?.putIfAbsent !== "function") {
    throw new VerifiedSignaturePersistenceError(
      VERIFIED_SIGNATURE_PERSISTENCE_ERROR.CAPABILITY_INVALID,
      "Verified signature persistence capabilities are invalid",
    );
  }

  let record;
  try {
    record = readVerifiedLocalSignatureRecord(evidence);
  } catch (error) {
    if (error?.code !== LOCAL_SIGNATURE_EVIDENCE_ERROR.EVIDENCE_INVALID) throw error;
    throw new VerifiedSignaturePersistenceError(
      VERIFIED_SIGNATURE_PERSISTENCE_ERROR.EVIDENCE_INVALID,
      "Verified signature evidence is invalid",
      error,
    );
  }

  try {
    await capabilities.signatureStore.putIfAbsent(record);
  } catch (error) {
    throw new VerifiedSignaturePersistenceError(
      VERIFIED_SIGNATURE_PERSISTENCE_ERROR.PERSIST_FAILED,
      "Verified signature could not be persisted",
      error,
    );
  }
  return record;
}
