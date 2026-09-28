const CAPABILITY_KEYS = Object.freeze(["readVerifiedLocalSignatureRecord", "signatureStore"]);

export const SIGNATURE_PERSISTENCE_ERROR = Object.freeze({
  CAPABILITY_INVALID: "I12_SIGNATURE_PERSISTENCE_CAPABILITY_INVALID",
  FAILED: "I12_SIGNATURE_PERSISTENCE_FAILED",
});

export class SignaturePersistenceError extends Error {
  constructor(code, message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = "SignaturePersistenceError";
    this.code = code;
  }
}

function hasExactCapabilities(capabilities) {
  if (capabilities === null || typeof capabilities !== "object" || Array.isArray(capabilities)) return false;
  const keys = Object.keys(capabilities).sort();
  return keys.length === CAPABILITY_KEYS.length
    && keys.every((key, index) => key === CAPABILITY_KEYS[index])
    && typeof capabilities.readVerifiedLocalSignatureRecord === "function"
    && typeof capabilities.signatureStore?.putIfAbsent === "function";
}

export async function persistVerifiedLocalSignatureEvidence(evidence, capabilities) {
  if (!hasExactCapabilities(capabilities)) {
    throw new SignaturePersistenceError(
      SIGNATURE_PERSISTENCE_ERROR.CAPABILITY_INVALID,
      "Signature persistence capabilities are invalid",
    );
  }

  const record = capabilities.readVerifiedLocalSignatureRecord(evidence);
  try {
    await capabilities.signatureStore.putIfAbsent(record);
  } catch (error) {
    throw new SignaturePersistenceError(
      SIGNATURE_PERSISTENCE_ERROR.FAILED,
      "Verified local signature could not be persisted",
      error,
    );
  }
}
