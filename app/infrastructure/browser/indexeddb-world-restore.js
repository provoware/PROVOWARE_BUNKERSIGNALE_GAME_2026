const DB_VERSION = 1;
const STORE = "events";
const WORLD_INDEX = "by_world";

export class WorldRestoreStorageError extends Error {
  constructor(code, message, cause = undefined) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "WorldRestoreStorageError";
    this.code = code;
  }
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
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error || new Error("IndexedDB transaction aborted")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error || new Error("IndexedDB transaction failed")),
      { once: true },
    );
  });
}

function createEventsStore(db) {
  const store = db.createObjectStore(STORE, { keyPath: "event_id" });
  store.createIndex("by_world", "world_id", { unique: false });
  store.createIndex("by_world_lamport", ["world_id", "lamport", "event_id"], { unique: false });
  return store;
}

export function createIndexedDbWorldRestore({
  indexedDB,
  dbName = "provoware-bunkersignale",
  faultInjector = null,
} = {}) {
  if (!indexedDB) throw new TypeError("indexedDB capability is required");

  async function open() {
    const request = indexedDB.open(dbName, DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) createEventsStore(db);
    });
    return requestResult(request);
  }

  async function restoreIfEmpty(worldId, events) {
    if (typeof worldId !== "string" || !worldId) throw new TypeError("worldId is required");
    if (!Array.isArray(events)) throw new TypeError("events must be an array");

    const db = await open();
    try {
      const transaction = db.transaction(STORE, "readwrite");
      const done = transactionDone(transaction);
      const store = transaction.objectStore(STORE);

      try {
        const existingCount = await requestResult(
          store.index(WORLD_INDEX).count(IDBKeyRange.only(worldId)),
        );
        if (existingCount !== 0) {
          try { transaction.abort(); } catch {}
          try { await done; } catch {}
          throw new WorldRestoreStorageError(
            "SSI-RESTORE-2001",
            "target world already contains events",
          );
        }

        events.forEach((event, index) => {
          const clonedEvent = structuredClone(event);
          store.add({
            world_id: worldId,
            event_id: clonedEvent.event_id,
            lamport: clonedEvent.lamport,
            event: clonedEvent,
          });
          faultInjector?.({
            phase: "after-write-queued",
            writeCount: index + 1,
            transaction,
          });
        });

        await done;
      } catch (error) {
        if (error instanceof WorldRestoreStorageError) throw error;
        try { transaction.abort(); } catch {}
        try { await done; } catch {}
        throw new WorldRestoreStorageError(
          "SSI-RESTORE-2002",
          "atomic restore transaction failed",
          error,
        );
      }
    } finally {
      db.close();
    }
  }

  return Object.freeze({ restoreIfEmpty });
}
