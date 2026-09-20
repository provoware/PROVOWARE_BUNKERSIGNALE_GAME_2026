const DB_VERSION = 2;
const STORE = "signing_keys";
const PUBLIC_KEY_STORE = "public_keys";
const ACTIVE_SLOT = "active";
const KEY_ID_RE = /^key:sha256:[0-9a-f]{64}$/;
const RECORD_FIELDS = ["key_id", "private_key", "public_key", "slot"];

export const SIGNING_KEY_STORE_ERROR = Object.freeze({
  ALREADY_EXISTS: "I12_KEY_ALREADY_EXISTS",
  INVALID_RECORD: "I12_KEY_RECORD_INVALID",
  OPEN_FAILED: "I12_KEY_STORAGE_OPEN_FAILED",
  READ_FAILED: "I12_KEY_STORAGE_READ_FAILED",
  WRITE_FAILED: "I12_KEY_STORAGE_WRITE_FAILED",
});

export class SigningKeyStoreError extends Error {
  constructor(code, message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = "SigningKeyStoreError";
    this.code = code;
  }
}

function isCryptoKey(key, type, usage, extractable = null) {
  return typeof globalThis.CryptoKey === "function"
    && key instanceof globalThis.CryptoKey
    && key.type === type
    && key.algorithm?.name === "Ed25519"
    && key.usages.includes(usage)
    && (extractable === null || key.extractable === extractable);
}

function isValidRecord(record) {
  return record
    && typeof record === "object"
    && Object.keys(record).sort().join(",") === RECORD_FIELDS.join(",")
    && record.slot === ACTIVE_SLOT
    && KEY_ID_RE.test(record.key_id)
    && isCryptoKey(record.private_key, "private", "sign", false)
    && isCryptoKey(record.public_key, "public", "verify");
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", resolve, { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error || new Error("IndexedDB transaction aborted")), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error || new Error("IndexedDB transaction failed")), { once: true });
  });
}

export function createIndexedDbSigningKeyStore({
  indexedDB,
  dbName = "provoware-bunkersignale-i12",
} = {}) {
  if (!indexedDB) throw new TypeError("indexedDB capability is required");

  function open() {
    const request = indexedDB.open(dbName, DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "slot" });
      if (!db.objectStoreNames.contains(PUBLIC_KEY_STORE)) db.createObjectStore(PUBLIC_KEY_STORE, { keyPath: "key_id" });
    });
    return new Promise((resolve, reject) => {
      let settled = false;
      request.addEventListener("success", () => {
        if (settled) {
          request.result.close();
          return;
        }
        settled = true;
        resolve(request.result);
      }, { once: true });
      request.addEventListener("error", () => {
        if (settled) return;
        settled = true;
        reject(new SigningKeyStoreError(
          SIGNING_KEY_STORE_ERROR.OPEN_FAILED,
          "Signing key storage could not be opened",
          request.error,
        ));
      }, { once: true });
      request.addEventListener("blocked", () => {
        if (settled) return;
        settled = true;
        reject(new SigningKeyStoreError(
          SIGNING_KEY_STORE_ERROR.OPEN_FAILED,
          "Signing key storage open was blocked",
        ));
      }, { once: true });
    });
  }

  async function readActive() {
    const db = await open();
    try {
      const transaction = db.transaction(STORE, "readonly");
      const done = transactionDone(transaction);
      let record;
      try {
        record = await requestResult(transaction.objectStore(STORE).get(ACTIVE_SLOT));
        await done;
      } catch (error) {
        throw new SigningKeyStoreError(
          SIGNING_KEY_STORE_ERROR.READ_FAILED,
          "Active signing key could not be read",
          error,
        );
      }
      if (record === undefined) return null;
      if (!isValidRecord(record)) {
        throw new SigningKeyStoreError(
          SIGNING_KEY_STORE_ERROR.INVALID_RECORD,
          "Stored active signing key record is invalid",
        );
      }
      return record;
    } finally {
      db.close();
    }
  }

  async function putIfAbsent(record) {
    if (!isValidRecord(record)) {
      throw new SigningKeyStoreError(
        SIGNING_KEY_STORE_ERROR.INVALID_RECORD,
        "Signing key record is invalid",
      );
    }

    const db = await open();
    try {
      const transaction = db.transaction(STORE, "readwrite");
      const done = transactionDone(transaction);
      const objectStore = transaction.objectStore(STORE);
      try {
        const existing = await requestResult(objectStore.get(ACTIVE_SLOT));
        if (existing !== undefined) {
          await done;
          throw new SigningKeyStoreError(
            SIGNING_KEY_STORE_ERROR.ALREADY_EXISTS,
            "Active signing key already exists",
          );
        }
        await requestResult(objectStore.add(record));
        await done;
      } catch (error) {
        if (error instanceof SigningKeyStoreError) throw error;
        try { transaction.abort(); } catch {}
        try { await done; } catch {}
        throw new SigningKeyStoreError(
          SIGNING_KEY_STORE_ERROR.WRITE_FAILED,
          "Active signing key could not be stored",
          error,
        );
      }
    } finally {
      db.close();
    }
  }

  return Object.freeze({ putIfAbsent, readActive });
}
