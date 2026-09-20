const KEY_ID = /^key:sha256:[0-9a-f]{64}$/;

export const ACTIVE_KEY_REGISTRATION_ERROR = Object.freeze({
  MISSING: "I12_ACTIVE_KEY_MISSING",
  EXPORT_FAILED: "I12_ACTIVE_KEY_EXPORT_FAILED",
  ID_DERIVE_FAILED: "I12_ACTIVE_KEY_ID_DERIVE_FAILED",
  ID_MISMATCH: "I12_ACTIVE_KEY_ID_MISMATCH",
  REGISTRATION_FAILED: "I12_ACTIVE_KEY_REGISTRATION_FAILED",
});

export class ActiveKeyRegistrationError extends Error {
  constructor(code, message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = "ActiveKeyRegistrationError";
    this.code = code;
  }
}

function fail(code, message, cause = null) {
  return new ActiveKeyRegistrationError(code, message, cause);
}

export async function ensureActiveSigningKeyRegistered({
  signingKeyStore,
  publicKeyStore,
  exportPublicKey,
  deriveKeyId,
}) {
  if (typeof signingKeyStore?.readActive !== "function"
    || typeof publicKeyStore?.putIfAbsent !== "function"
    || typeof exportPublicKey !== "function"
    || typeof deriveKeyId !== "function") {
    throw new TypeError("P2-L capabilities are required");
  }

  const active = await signingKeyStore.readActive();
  if (active === null) throw fail(ACTIVE_KEY_REGISTRATION_ERROR.MISSING, "Active signing key is missing");

  let publicKeyBytes;
  try {
    publicKeyBytes = await exportPublicKey(active.public_key);
  } catch (error) {
    throw fail(ACTIVE_KEY_REGISTRATION_ERROR.EXPORT_FAILED, "Active public key export failed", error);
  }
  if (!(publicKeyBytes instanceof Uint8Array) || publicKeyBytes.length !== 32) {
    throw fail(ACTIVE_KEY_REGISTRATION_ERROR.EXPORT_FAILED, "Active public key export is invalid");
  }

  let keyId;
  try {
    keyId = await deriveKeyId(new Uint8Array(publicKeyBytes));
  } catch (error) {
    throw fail(ACTIVE_KEY_REGISTRATION_ERROR.ID_DERIVE_FAILED, "Active key_id derivation failed", error);
  }
  if (!KEY_ID.test(keyId)) {
    throw fail(ACTIVE_KEY_REGISTRATION_ERROR.ID_DERIVE_FAILED, "Derived active key_id is invalid");
  }
  if (keyId !== active.key_id) {
    throw fail(ACTIVE_KEY_REGISTRATION_ERROR.ID_MISMATCH, "Active key_id does not match exported public key");
  }

  const storedBytes = new Uint8Array(publicKeyBytes);
  try {
    await publicKeyStore.putIfAbsent({
      key_id: keyId,
      algorithm: "Ed25519",
      public_key_bytes: storedBytes,
    });
  } catch (error) {
    throw fail(ACTIVE_KEY_REGISTRATION_ERROR.REGISTRATION_FAILED, "Active public key registration failed", error);
  }

  return Object.freeze({ key_id: keyId, public_key_bytes: new Uint8Array(publicKeyBytes) });
}
