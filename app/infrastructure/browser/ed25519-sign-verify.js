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
