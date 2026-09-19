const DB_VERSION = 1;
const STORE = "events";

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

function legacyRecordEvent(record) {
  if (record && typeof record === "object" && record.event) return record.event;
  const { world_id: _worldId, ...event } = record;
  return event;
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", resolve, { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error || new Error("IndexedDB transaction aborted")), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error || new Error("IndexedDB transaction failed")), { once: true });
  });
}

export function createIndexedDbEventStore({ indexedDB, dbName = "provoware-bunkersignale", faultInjector = null } = {}) {
  if (!indexedDB) throw new TypeError("indexedDB capability is required");

  async function open() {
    const request = indexedDB.open(dbName, DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (db.objectStoreNames.contains(STORE)) return;
      const store = db.createObjectStore(STORE, { keyPath: "event_id" });
      store.createIndex("by_world", "world_id", { unique: false });
      store.createIndex("by_world_lamport", ["world_id", "lamport", "event_id"], { unique: false });
    });
    return requestResult(request);
  }

  async function append(worldId, events) {
    if (typeof worldId !== "string" || !worldId) throw new TypeError("worldId is required");
    if (!Array.isArray(events) || events.length === 0) throw new TypeError("append requires at least one event");
    const db = await open();
    try {
      const transaction = db.transaction(STORE, "readwrite");
      const done = transactionDone(transaction);
      const store = transaction.objectStore(STORE);
      try {
        events.forEach((event, index) => {
          const clonedEvent = structuredClone(event);
          store.add({
            world_id: worldId,
            event_id: clonedEvent.event_id,
            lamport: clonedEvent.lamport,
            event: clonedEvent,
          });
          faultInjector?.({ phase: "after-write-queued", writeCount: index + 1, transaction });
        });
      } catch (error) {
        try { transaction.abort(); } catch {}
        try { await done; } catch {}
        throw error;
      }
      await done;
    } finally {
      db.close();
    }
  }

  async function readWorld(worldId) {
    if (typeof worldId !== "string" || !worldId) throw new TypeError("worldId is required");
    const db = await open();
    try {
      const transaction = db.transaction(STORE, "readonly");
      const done = transactionDone(transaction);
      const index = transaction.objectStore(STORE).index("by_world_lamport");
      const range = IDBKeyRange.bound([worldId, 0, ""], [worldId, Number.MAX_SAFE_INTEGER, "\uffff"]);
      const records = await requestResult(index.getAll(range));
      await done;
      return records.map(record => structuredClone(legacyRecordEvent(record)));
    } finally {
      db.close();
    }
  }

  return Object.freeze({ append, readWorld });
}
