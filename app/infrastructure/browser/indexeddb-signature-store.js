const DB_VERSION = 3;
const SIGNING_KEY_STORE = "signing_keys";
const PUBLIC_KEY_STORE = "public_keys";
const SIGNATURE_STORE = "event_signatures";
const EVENT_INDEX = "by_world_event";
const WORLD_ID_RE = /^world:[0-9a-f]{24}$/;
const EVENT_ID_RE = /^event:[0-9a-f]{24}$/;
const ACTOR_ID_RE = /^actor:[0-9a-f]{24}$/;
const KEY_ID_RE = /^key:sha256:[0-9a-f]{64}$/;
const SIGNATURE_RE = /^[A-Za-z0-9_-]{85}[AQgw]$/;
const RECORD_FIELDS = ["algorithm", "author_id", "event_id", "format", "format_version", "key_id", "signature", "world_id"];

export const SIGNATURE_STORE_ERROR = Object.freeze({
  INVALID_RECORD: "I12_SIGNATURE_RECORD_INVALID",
  CONFLICT: "I12_SIGNATURE_CONFLICT",
  OPEN_FAILED: "I12_SIGNATURE_STORAGE_OPEN_FAILED",
  READ_FAILED: "I12_SIGNATURE_STORAGE_READ_FAILED",
  WRITE_FAILED: "I12_SIGNATURE_STORAGE_WRITE_FAILED",
});

export class SignatureStoreError extends Error {
  constructor(code, message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = "SignatureStoreError";
    this.code = code;
  }
}

function normalize(record, stored = false) {
  const valid = record
    && typeof record === "object"
    && !Array.isArray(record)
    && Object.keys(record).sort().join(",") === RECORD_FIELDS.join(",")
    && record.format === "ssi-event-signature"
    && record.format_version === 1
    && WORLD_ID_RE.test(record.world_id)
    && EVENT_ID_RE.test(record.event_id)
    && ACTOR_ID_RE.test(record.author_id)
    && KEY_ID_RE.test(record.key_id)
    && record.algorithm === "Ed25519"
    && SIGNATURE_RE.test(record.signature);
  if (!valid) {
    throw new SignatureStoreError(
      SIGNATURE_STORE_ERROR.INVALID_RECORD,
      stored ? "Stored signature record is invalid" : "Signature record is invalid",
    );
  }
  return { ...record };
}

function sameRecord(left, right) {
  return RECORD_FIELDS.every(field => left[field] === right[field]);
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

export function createIndexedDbSignatureStore({
  indexedDB,
  dbName = "provoware-bunkersignale-i12",
} = {}) {
  if (!indexedDB) throw new TypeError("indexedDB capability is required");

  function open() {
    const request = indexedDB.open(dbName, DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SIGNING_KEY_STORE)) db.createObjectStore(SIGNING_KEY_STORE, { keyPath: "slot" });
      if (!db.objectStoreNames.contains(PUBLIC_KEY_STORE)) db.createObjectStore(PUBLIC_KEY_STORE, { keyPath: "key_id" });
      if (!db.objectStoreNames.contains(SIGNATURE_STORE)) {
        const store = db.createObjectStore(SIGNATURE_STORE, { keyPath: ["world_id", "event_id", "key_id"] });
        store.createIndex(EVENT_INDEX, ["world_id", "event_id"], { unique: false });
      }
    });
    return new Promise((resolve, reject) => {
      let settled = false;
      request.addEventListener("success", () => {
        if (settled) { request.result.close(); return; }
        settled = true;
        resolve(request.result);
      }, { once: true });
      const fail = message => {
        if (settled) return;
        settled = true;
        reject(new SignatureStoreError(SIGNATURE_STORE_ERROR.OPEN_FAILED, message, request.error));
      };
      request.addEventListener("error", () => fail("Signature storage could not be opened"), { once: true });
      request.addEventListener("blocked", () => fail("Signature storage open was blocked"), { once: true });
    });
  }

  async function readByEvent(worldId, eventId) {
    if (!WORLD_ID_RE.test(worldId) || !EVENT_ID_RE.test(eventId)) {
      throw new SignatureStoreError(SIGNATURE_STORE_ERROR.INVALID_RECORD, "Signature lookup IDs are invalid");
    }
    const db = await open();
    try {
      const transaction = db.transaction(SIGNATURE_STORE, "readonly");
      const done = transactionDone(transaction);
      let records;
      try {
        records = await requestResult(transaction.objectStore(SIGNATURE_STORE).index(EVENT_INDEX).getAll([worldId, eventId]));
        await done;
      } catch (error) {
        throw new SignatureStoreError(SIGNATURE_STORE_ERROR.READ_FAILED, "Signatures could not be read", error);
      }
      return records.map(record => normalize(record, true)).sort((left, right) => left.key_id.localeCompare(right.key_id));
    } finally {
      db.close();
    }
  }

  async function putIfAbsent(record) {
    const normalized = normalize(record);
    const identity = [normalized.world_id, normalized.event_id, normalized.key_id];
    const db = await open();
    try {
      const transaction = db.transaction(SIGNATURE_STORE, "readwrite");
      const done = transactionDone(transaction);
      const objectStore = transaction.objectStore(SIGNATURE_STORE);
      try {
        const existing = await requestResult(objectStore.get(identity));
        if (existing !== undefined) {
          const current = normalize(existing, true);
          await done;
          if (sameRecord(current, normalized)) return;
          throw new SignatureStoreError(SIGNATURE_STORE_ERROR.CONFLICT, "Signature conflicts with existing identity");
        }
        await requestResult(objectStore.add(normalized));
        await done;
      } catch (error) {
        if (error instanceof SignatureStoreError) throw error;
        try { transaction.abort(); } catch {}
        try { await done; } catch {}
        throw new SignatureStoreError(SIGNATURE_STORE_ERROR.WRITE_FAILED, "Signature could not be stored", error);
      }
    } finally {
      db.close();
    }
  }

  return Object.freeze({ putIfAbsent, readByEvent });
}
