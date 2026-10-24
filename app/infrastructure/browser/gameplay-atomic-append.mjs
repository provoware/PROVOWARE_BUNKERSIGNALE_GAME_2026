/**
 * Opt-in gameplay writer for an already initialized I08 IndexedDB database.
 * This does NOT reopen frozen I08 or the read-only I10 UI. Only gameplay callers
 * that use this writer are protected from concurrent/stale command submissions.
 */
const WORLD = /^world:[0-9a-f]{24}$/;
const EVENT = /^event:[0-9a-f]{24}$/;
const ACTOR = /^actor:[0-9a-f]{24}$/;
const REQUEST = /^req:[0-9a-f]{24}$/;
const TYPE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const FIELDS = ["event_id", "event_type", "payload", "author_id", "sequence", "lamport", "ruleset_version", "metadata", "command_id"];
const safe = n => Number.isSafeInteger(n) && n >= 0;
const plain = x => x !== null && typeof x === "object" && !Array.isArray(x) &&
  (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
const failure = code => Object.assign(new Error(code), { code });

function dataOnly(value, fields) {
  if (!plain(value) || Object.keys(value).length !== fields.length) return false;
  return fields.every(field => {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    return descriptor && Object.hasOwn(descriptor, "value");
  });
}

function cloneEvents(events) {
  if (!Array.isArray(events) || events.length === 0 || events.length > 1000) throw failure("INVALID_GAMEPLAY_BATCH");
  const seenIds = new Set(), seenRequests = new Set();
  return events.map(event => {
    if (!dataOnly(event, FIELDS) || typeof event.event_id !== "string" || !EVENT.test(event.event_id) ||
        typeof event.event_type !== "string" || !TYPE.test(event.event_type) ||
        typeof event.author_id !== "string" || !ACTOR.test(event.author_id) ||
        typeof event.command_id !== "string" || !REQUEST.test(event.command_id) ||
        typeof event.ruleset_version !== "string" || !VERSION.test(event.ruleset_version) ||
        !plain(event.payload) || !plain(event.metadata) ||
        !safe(event.sequence) || event.sequence === 0 || !safe(event.lamport) ||
        seenIds.has(event.event_id) || seenRequests.has(event.command_id)) {
      throw failure("INVALID_GAMEPLAY_EVENT");
    }
    seenIds.add(event.event_id);
    seenRequests.add(event.command_id);
    try { return structuredClone(event); }
    catch { throw failure("UNCLONEABLE_GAMEPLAY_EVENT"); }
  });
}

function inspectHistory(records, worldId) {
  let sequence = 0, lamport = 0, ruleset = null;
  const requests = new Set();
  for (const record of records) {
    if (!record || record.world_id !== worldId) throw failure("INVALID_WORLD_HISTORY");
    const event = record.event || record;
    if (!event || !safe(event.sequence) || event.sequence !== sequence + 1 ||
        !safe(event.lamport) || (sequence > 0 && event.lamport <= lamport) ||
        (typeof event.command_id !== "string" || !REQUEST.test(event.command_id)) || requests.has(event.command_id) ||
        (typeof event.ruleset_version !== "string" || !VERSION.test(event.ruleset_version))) {
      throw failure("INVALID_WORLD_HISTORY");
    }
    if (ruleset !== null && event.ruleset_version !== ruleset) throw failure("INVALID_WORLD_HISTORY");
    ruleset = event.ruleset_version;
    requests.add(event.command_id);
    sequence = event.sequence;
    lamport = event.lamport;
  }
  return { sequence, lamport, requests, ruleset };
}

function verifyAppend(records, worldId, events, expectedSequence, previousLamport) {
  const previous = inspectHistory(records, worldId);
  if (previous.sequence !== expectedSequence) throw failure("STALE_SEQUENCE");
  if (previous.lamport !== previousLamport) throw failure("STALE_LAMPORT");
  const ruleset = previous.ruleset ?? events[0].ruleset_version;
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (previous.requests.has(event.command_id)) throw failure("DUPLICATE_REQUEST");
    if (event.ruleset_version !== ruleset) throw failure("RULESET_MISMATCH");
    if (event.sequence !== expectedSequence + i + 1) throw failure("STALE_SEQUENCE");
    if (event.lamport !== previousLamport + i + 1) throw failure("STALE_LAMPORT");
  }
}

function openExisting(indexedDB, dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    // A missing I08 database must not silently become an incompatible v1 database.
    request.addEventListener("upgradeneeded", () => request.transaction.abort(), { once: true });
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(failure("I08_STORE_NOT_READY")), { once: true });
    request.addEventListener("blocked", () => reject(failure("I08_STORE_BLOCKED")), { once: true });
  });
}

export function createGameplayAtomicAppender({ indexedDB, dbName = "provoware-bunkersignale", faultInjector = null } = {}) {
  if (!indexedDB || typeof indexedDB.open !== "function") throw new TypeError("indexedDB capability is required");
  if (typeof dbName !== "string" || !dbName || (faultInjector !== null && typeof faultInjector !== "function")) {
    throw new TypeError("Invalid writer configuration");
  }
  async function append(worldId, inputEvents, options) {
    if (typeof worldId !== "string" || !WORLD.test(worldId) ||
        !(dataOnly(options, ["expected_sequence", "previous_lamport"]) ||
          dataOnly(options, ["expected_sequence", "previous_lamport", "verify_history"])) ||
        !safe(options.expected_sequence) || !safe(options.previous_lamport) ||
        (Object.hasOwn(options, "verify_history") && typeof options.verify_history !== "function")) {
      throw failure("INVALID_GAMEPLAY_APPEND");
    }
    const events = cloneEvents(inputEvents);
    if (events.length > Number.MAX_SAFE_INTEGER - options.expected_sequence ||
        events.length > Number.MAX_SAFE_INTEGER - options.previous_lamport) throw failure("SEQUENCE_EXHAUSTED");
    const db = await openExisting(indexedDB, dbName);
    try {
      if (!db.objectStoreNames.contains("events")) throw failure("I08_STORE_NOT_READY");
      await new Promise((resolve, reject) => {
        const tx = db.transaction("events", "readwrite");
        let problem = null;
        const abort = error => { problem = error; try { tx.abort(); } catch {} };
        tx.addEventListener("complete", () => resolve(), { once: true });
        tx.addEventListener("abort", () => reject(problem || failure("GAMEPLAY_TRANSACTION_ABORTED")), { once: true });
        tx.addEventListener("error", () => { problem ||= failure("GAMEPLAY_TRANSACTION_FAILED"); }, { once: true });
        try {
          const store = tx.objectStore("events");
          const index = store.index("by_world_lamport");
          const range = IDBKeyRange.bound([worldId, 0, ""], [worldId, Number.MAX_SAFE_INTEGER, "\uffff"]);
          const request = index.getAll(range);
          request.addEventListener("error", () => abort(failure("GAMEPLAY_HISTORY_READ_FAILED")), { once: true });
          request.addEventListener("success", () => {
            try {
              verifyAppend(request.result, worldId, events, options.expected_sequence, options.previous_lamport);
              // The replay guard runs synchronously *inside* the readwrite transaction,
              // after its authoritative history read and before any write is queued.
              // Pass copies: even a hostile validator cannot alter the committed events.
              if (Object.hasOwn(options, "verify_history")) {
                const history = request.result.map(record => structuredClone(record.event || record));
                const proposed = events.map(event => structuredClone(event));
                if (options.verify_history(history, proposed) !== true) {
                  throw failure("GAMEPLAY_REPLAY_REJECTED");
                }
              }
              events.forEach((event, i) => {
                store.add({ world_id: worldId, event_id: event.event_id, lamport: event.lamport, event });
                faultInjector?.({ phase: "after-write-queued", writeCount: i + 1, transaction: tx });
              });
            } catch (error) { abort(error); }
          }, { once: true });
        } catch (error) { abort(error); }
      });
      return Object.freeze({ ok: true, count: events.length });
    } finally { db.close(); }
  }
  return Object.freeze({ append });
}
