import {
  ActiveKeyRegistrationError,
  ensureActiveSigningKeyRegistered,
} from "./active-key-registration.js";
import { signEventDetached } from "./event-signature.js";

const CONTEXT_KEYS = Object.freeze(["chainEntry", "event", "i11Verified", "worldId"]);
const CAPABILITY_KEYS = Object.freeze([
  "canonicalEventBytes",
  "deriveKeyId",
  "exportPublicKey",
  "publicKeyStore",
  "sha256Hex",
  "signBytes",
  "signingKeyStore",
]);

export const REGISTERED_SIGN_ERROR = Object.freeze({
  CONTEXT_INVALID: "I12_REGISTERED_SIGN_CONTEXT_INVALID",
  CAPABILITY_INVALID: "I12_REGISTERED_SIGN_CAPABILITY_INVALID",
  SIGN_FAILED: "I12_REGISTERED_SIGN_FAILED",
});

export class RegisteredSignError extends Error {
  constructor(code, message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = "RegisteredSignError";
    this.code = code;
  }
}

function sameKeys(value, expected) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function assertContext(context) {
  if (!sameKeys(context, CONTEXT_KEYS)) {
    throw new RegisteredSignError(
      REGISTERED_SIGN_ERROR.CONTEXT_INVALID,
      "Registered sign context is invalid",
    );
  }
}

function assertCapabilities(capabilities) {
  if (!sameKeys(capabilities, CAPABILITY_KEYS)
    || typeof capabilities.signingKeyStore?.readActive !== "function"
    || typeof capabilities.publicKeyStore?.putIfAbsent !== "function"
    || typeof capabilities.exportPublicKey !== "function"
    || typeof capabilities.deriveKeyId !== "function"
    || typeof capabilities.signBytes !== "function"
    || typeof capabilities.canonicalEventBytes !== "function"
    || typeof capabilities.sha256Hex !== "function") {
    throw new RegisteredSignError(
      REGISTERED_SIGN_ERROR.CAPABILITY_INVALID,
      "Registered sign capabilities are invalid",
    );
  }
}

export async function signEventWithRegisteredActiveKey(context, capabilities) {
  assertContext(context);
  assertCapabilities(capabilities);

  const registration = await ensureActiveSigningKeyRegistered({
    signingKeyStore: capabilities.signingKeyStore,
    publicKeyStore: capabilities.publicKeyStore,
    exportPublicKey: capabilities.exportPublicKey,
    deriveKeyId: capabilities.deriveKeyId,
  });

  try {
    return await signEventDetached(
      { ...context, keyId: registration.key_id },
      {
        signBytes: capabilities.signBytes,
        canonicalEventBytes: capabilities.canonicalEventBytes,
        sha256Hex: capabilities.sha256Hex,
      },
    );
  } catch (error) {
    if (error instanceof ActiveKeyRegistrationError) throw error;
    throw new RegisteredSignError(
      REGISTERED_SIGN_ERROR.SIGN_FAILED,
      "Registered event signing failed",
      error,
    );
  }
}
