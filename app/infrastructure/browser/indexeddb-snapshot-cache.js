const DB_VERSION = 1;
const STORE = "snapshots";

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

function isStateObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSnapshotRecord(record) {
  return record !== null
    && typeof record === "object"
    && typeof record.world_id === "string"
    && record.world_id.length > 0
    && typeof record.ruleset_version === "string"
    && record.ruleset_version.length > 0
    && typeof record.event_fingerprint === "string"
    && record.event_fingerprint.length > 0
    && Number.isInteger(record.event_count)
    && record.event_count >= 0
    && isStateObject(record.state);
}

function assertSnapshotRecord(record) {
  if (!isSnapshotRecord(record)) throw new TypeError("valid snapshot record is required");
}

function assertReadRequest(worldId, { eventFingerprint, rulesetVersion, eventCount }) {
  if (typeof worldId !== "string" || !worldId) throw new TypeError("worldId is required");
  if (typeof eventFingerprint !== "string" || !eventFingerprint) throw new TypeError("eventFingerprint is required");
  if (typeof rulesetVersion !== "string" || !rulesetVersion) throw new TypeError("rulesetVersion is required");
  if (!Number.isInteger(eventCount) || eventCount < 0) throw new TypeError("eventCount must be a non-negative integer");
}

export function createIndexedDbSnapshotCache({
  indexedDB,
  dbName = "provoware-bunkersignale-snapshots",
  faultInjector = null,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
} = {}) {
  if (!indexedDB) throw new TypeError("indexedDB capability is required");
  if (typeof now !== "function") throw new TypeError("now must be a function");

  async function open() {
    const request = indexedDB.open(dbName, DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "world_id" });
      }
    });
    return requestResult(request);
  }

  async function discard(worldId) {
    if (typeof worldId !== "string" || !worldId) throw new TypeError("worldId is required");
    const db = await open();
    try {
      const transaction = db.transaction(STORE, "readwrite");
      const done = transactionDone(transaction);
      transaction.objectStore(STORE).delete(worldId);
      await done;
    } finally {
      db.close();
    }
  }

  async function write(snapshot) {
    assertSnapshotRecord(snapshot);
    const db = await open();
    try {
      const transaction = db.transaction(STORE, "readwrite");
      const done = transactionDone(transaction);
      try {
        transaction.objectStore(STORE).put(structuredClone(snapshot));
        faultInjector?.({ phase: "after-write-queued", transaction });
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

  async function readValid(worldId, { eventFingerprint, rulesetVersion, eventCount }) {
    assertReadRequest(worldId, { eventFingerprint, rulesetVersion, eventCount });

    const db = await open();
    let record;
    try {
      const transaction = db.transaction(STORE, "readonly");
      const done = transactionDone(transaction);
      record = await requestResult(transaction.objectStore(STORE).get(worldId));
      await done;
    } finally {
      db.close();
    }

    if (record === undefined) return null;
    const valid = isSnapshotRecord(record)
      && record.world_id === worldId
      && record.event_fingerprint === eventFingerprint
      && record.ruleset_version === rulesetVersion
      && record.event_count === eventCount;

    if (!valid) {
      await discard(worldId);
      return null;
    }
    return structuredClone(record);
  }

  async function resolveState({ worldId, eventFingerprint, rulesetVersion, eventCount, replay }) {
    if (typeof replay !== "function") throw new TypeError("replay must be a function");
    assertReadRequest(worldId, { eventFingerprint, rulesetVersion, eventCount });
    const started = now();
    let snapshot = null;
    try {
      snapshot = await readValid(worldId, { eventFingerprint, rulesetVersion, eventCount });
    } catch {
      snapshot = null;
    }
    if (snapshot !== null) {
      return Object.freeze({
        source: "snapshot",
        state: structuredClone(snapshot.state),
        elapsed_ms: Math.max(0, now() - started),
      });
    }

    const replayedState = await replay();
    if (!isStateObject(replayedState)) throw new TypeError("replay must return a state object");
    return Object.freeze({
      source: "replay",
      state: structuredClone(replayedState),
      elapsed_ms: Math.max(0, now() - started),
    });
  }

  return Object.freeze({ write, readValid, discard, resolveState });
}
