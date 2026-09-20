const PROBE = Object.freeze({ name: "Ed25519" });

export async function detectBrowserEd25519(subtle = globalThis.crypto?.subtle) {
  if (!subtle || typeof subtle.generateKey !== "function") return "unsupported";
  try {
    const pair = await subtle.generateKey(PROBE, false, ["sign", "verify"]);
    return pair?.privateKey && pair?.publicKey ? "supported" : "unsupported";
  } catch {
    return "unsupported";
  }
}
