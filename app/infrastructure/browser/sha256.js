const SHA256_HEX = /^[0-9a-f]{64}$/;

export function createBrowserSha256Hex(subtle = globalThis.crypto?.subtle) {
  if (!subtle || typeof subtle.digest !== "function") {
    throw new Error("browser SHA-256 capability unavailable");
  }
  return async function sha256Hex(bytes) {
    if (!(bytes instanceof Uint8Array)) throw new TypeError("SHA-256 input must be Uint8Array");
    try {
      const digest = await subtle.digest("SHA-256", bytes);
      const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
      if (!SHA256_HEX.test(hex)) throw new Error("browser SHA-256 returned invalid digest");
      return hex;
    } catch (error) {
      if (error?.message === "browser SHA-256 returned invalid digest") throw error;
      throw new Error("browser SHA-256 digest failed", { cause: error });
    }
  };
}
