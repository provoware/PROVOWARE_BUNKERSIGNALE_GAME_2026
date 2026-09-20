const ED25519 = Object.freeze({ name: "Ed25519" });

export async function generateEd25519KeyPair(subtle = globalThis.crypto?.subtle) {
  if (!subtle || typeof subtle.generateKey !== "function") throw new Error("ed25519 unsupported");
  try {
    const pair = await subtle.generateKey(ED25519, false, ["sign", "verify"]);
    if (!pair?.privateKey || !pair?.publicKey || pair.privateKey.extractable) throw new Error();
    return pair;
  } catch {
    throw new Error("ed25519 key generation failed");
  }
}

export async function importEd25519PublicKey(bytes, subtle = globalThis.crypto?.subtle) {
  if (!subtle || typeof subtle.importKey !== "function") throw new Error("ed25519 unsupported");
  if (!(bytes instanceof Uint8Array) || bytes.length !== 32) throw new Error("ed25519 public key import failed");
  try {
    const key = await subtle.importKey("raw", bytes, ED25519, true, ["verify"]);
    if (!key || key.type !== "public" || !key.extractable) throw new Error();
    return key;
  } catch {
    throw new Error("ed25519 public key import failed");
  }
}

export async function exportEd25519PublicKey(publicKey, subtle = globalThis.crypto?.subtle) {
  if (!subtle || typeof subtle.exportKey !== "function") throw new Error("ed25519 unsupported");
  if (!publicKey || publicKey.type !== "public") throw new Error("ed25519 public key export failed");
  try {
    const bytes = new Uint8Array(await subtle.exportKey("raw", publicKey));
    if (bytes.length !== 32) throw new Error();
    return bytes;
  } catch {
    throw new Error("ed25519 public key export failed");
  }
}

export async function signEd25519(bytes, privateKey, subtle = globalThis.crypto?.subtle) {
  if (!subtle || typeof subtle.sign !== "function" || !privateKey) throw new Error("ed25519 unsupported");
  try {
    return new Uint8Array(await subtle.sign(ED25519, privateKey, bytes));
  } catch {
    throw new Error("ed25519 sign failed");
  }
}

export async function verifyEd25519(bytes, signature, publicKey, subtle = globalThis.crypto?.subtle) {
  if (!subtle || typeof subtle.verify !== "function" || !publicKey) return false;
  try {
    return (await subtle.verify(ED25519, publicKey, signature, bytes)) === true;
  } catch {
    return false;
  }
}
