const DB_VERSION = 2;
const SIGNING_KEY_STORE = "signing_keys";
const PUBLIC_KEY_STORE = "public_keys";
const KEY_ID_RE = /^key:sha256:[0-9a-f]{64}$/;
const RECORD_FIELDS = ["algorithm", "key_id", "public_key_bytes"];

export const PUBLIC_KEY_STORE_ERROR = Object.freeze({
  INVALID_RECORD: "I12_PUBLIC_KEY_RECORD_INVALID",
  KEY_ID_MISMATCH: "I12_PUBLIC_KEY_ID_MISMATCH",
  CONFLICT: "I12_PUBLIC_KEY_CONFLICT",
  OPEN_FAILED: "I12_PUBLIC_KEY_STORAGE_OPEN_FAILED",
  READ_FAILED: "I12_PUBLIC_KEY_STORAGE_READ_FAILED",
  WRITE_FAILED: "I12_PUBLIC_KEY_STORAGE_WRITE_FAILED",
});

export class PublicKeyStoreError extends Error {
  constructor(code, message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = "PublicKeyStoreError";
    this.code = code;
  }
}

function exactRecordShape(record) {
  return record
    && typeof record === "object"
    && !Array.isArray(record)
    && Object.keys(record).sort().join(",") === RECORD_FIELDS.join(",");
}

function copyBytes(bytes) {
  return new Uint8Array(bytes);
}

function sameBytes(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
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

export function createIndexedDbPublicKeyStore({
  indexedDB,
  deriveKeyId,
  dbName = "provoware-bunkersignale-i12",
} = {}) {
  if (!indexedDB) throw new TypeError("indexedDB capability is required");
  if (typeof deriveKeyId !== "function") throw new TypeError("deriveKeyId capability is required");

  async function normalize(record, stored = false) {
    if (!exactRecordShape(record)
      || !KEY_ID_RE.test(record.key_id)
      || record.algorithm !== "Ed25519"
      || !(record.public_key_bytes instanceof Uint8Array)
      || record.public_key_bytes.length !== 32) {
      throw new PublicKeyStoreError(
        PUBLIC_KEY_STORE_ERROR.INVALID_RECORD,
        stored ? "Stored public key record is invalid" : "Public key record is invalid",
      );
    }
    const bytes = copyBytes(record.public_key_bytes);
    let derived;
    try {
      derived = await deriveKeyId(bytes);
    } catch (error) {
      throw new PublicKeyStoreError(
        PUBLIC_KEY_STORE_ERROR.INVALID_RECORD,
        stored ? "Stored public key record cannot be verified" : "Public key record cannot be verified",
        error,
      );
    }
    if (derived !== record.key_id) {
      throw new PublicKeyStoreError(
        PUBLIC_KEY_STORE_ERROR.KEY_ID_MISMATCH,
        stored ? "Stored public key does not match key_id" : "Public key does not match key_id",
      );
    }
    return { key_id: record.key_id, algorithm: "Ed25519", public_key_bytes: bytes };
  }

  function open() {
    const request = indexedDB.open(dbName, DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SIGNING_KEY_STORE)) db.createObjectStore(SIGNING_KEY_STORE, { keyPath: "slot" });
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
        reject(new PublicKeyStoreError(
          PUBLIC_KEY_STORE_ERROR.OPEN_FAILED,
          "Public key storage could not be opened",
          request.error,
        ));
      }, { once: true });
      request.addEventListener("blocked", () => {
        if (settled) return;
        settled = true;
        reject(new PublicKeyStoreError(
          PUBLIC_KEY_STORE_ERROR.OPEN_FAILED,
          "Public key storage open was blocked",
        ));
      }, { once: true });
    });
  }

  async function readById(keyId) {
    if (!KEY_ID_RE.test(keyId)) {
      throw new PublicKeyStoreError(PUBLIC_KEY_STORE_ERROR.INVALID_RECORD, "key_id is invalid");
    }
    const db = await open();
    try {
      const transaction = db.transaction(PUBLIC_KEY_STORE, "readonly");
      const done = transactionDone(transaction);
      let record;
      try {
        record = await requestResult(transaction.objectStore(PUBLIC_KEY_STORE).get(keyId));
        await done;
      } catch (error) {
        throw new PublicKeyStoreError(
          PUBLIC_KEY_STORE_ERROR.READ_FAILED,
          "Historical public key could not be read",
          error,
        );
      }
      if (record === undefined) return null;
      return await normalize(record, true);
    } finally {
      db.close();
    }
  }

  async function putIfAbsent(record) {
    const normalized = await normalize(record);
    const db = await open();
    try {
      const transaction = db.transaction(PUBLIC_KEY_STORE, "readwrite");
      const done = transactionDone(transaction);
      const objectStore = transaction.objectStore(PUBLIC_KEY_STORE);
      try {
        const existing = await requestResult(objectStore.get(normalized.key_id));
        if (existing !== undefined) {
          const current = await normalize(existing, true);
          await done;
          if (current.algorithm === normalized.algorithm
            && sameBytes(current.public_key_bytes, normalized.public_key_bytes)) return;
          throw new PublicKeyStoreError(
            PUBLIC_KEY_STORE_ERROR.CONFLICT,
            "Historical public key conflicts with existing key_id",
          );
        }
        await requestResult(objectStore.add(normalized));
        await done;
      } catch (error) {
        if (error instanceof PublicKeyStoreError) throw error;
        try { transaction.abort(); } catch {}
        try { await done; } catch {}
        throw new PublicKeyStoreError(
          PUBLIC_KEY_STORE_ERROR.WRITE_FAILED,
          "Historical public key could not be stored",
          error,
        );
      }
    } finally {
      db.close();
    }
  }

  return Object.freeze({ putIfAbsent, readById });
}
