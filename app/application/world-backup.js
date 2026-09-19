const WORLD_ID = /^world:[0-9a-f]{24}$/;
const EVENT_ID = /^event:[0-9a-f]{24}$/;
const ACTOR_ID = /^actor:[0-9a-f]{24}$/;
const EVENT_TYPE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const RULESET_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const PRODUCT_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

const BACKUP_KEYS = Object.freeze([
  "format",
  "format_version",
  "world_id",
  "product_version",
  "content_lock_fingerprint",
  "event_count",
  "events",
]);

const REQUIRED_EVENT_KEYS = Object.freeze([
  "event_id",
  "event_type",
  "payload",
  "author_id",
  "sequence",
  "lamport",
  "ruleset_version",
  "metadata",
]);

const OPTIONAL_EVENT_KEYS = Object.freeze([
  "command_id",
  "correlation_id",
  "causation_event_id",
]);

const ALLOWED_EVENT_KEYS = new Set([...REQUIRED_EVENT_KEYS, ...OPTIONAL_EVENT_KEYS]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPlainObject(value, label) {
  if (!isPlainObject(value)) throw new TypeError(`${label} must be a plain object`);
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new TypeError(`${label} has missing or unexpected fields`);
  }
}

function normalizeCanonical(value) {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON rejects non-finite numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(normalizeCanonical);
  if (isPlainObject(value)) {
    const normalized = Object.create(null);
    for (const key of Object.keys(value).sort()) {
      Object.defineProperty(normalized, key, {
        value: normalizeCanonical(value[key]),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return normalized;
  }
  throw new TypeError(`Canonical JSON rejects value type ${typeof value}`);
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    value.forEach(deepFreeze);
    return Object.freeze(value);
  }
  if (isPlainObject(value)) {
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }
  return value;
}

function validateEventEnvelope(event) {
  assertPlainObject(event, "event");
  for (const key of REQUIRED_EVENT_KEYS) {
    if (!Object.hasOwn(event, key)) throw new TypeError(`event is missing ${key}`);
  }
  for (const key of Object.keys(event)) {
    if (!ALLOWED_EVENT_KEYS.has(key)) throw new TypeError(`event contains unexpected field ${key}`);
  }

  if (!EVENT_ID.test(event.event_id)) throw new TypeError("event_id is invalid");
  if (!ACTOR_ID.test(event.author_id)) throw new TypeError("author_id is invalid");
  if (!EVENT_TYPE.test(event.event_type)) throw new TypeError("event_type is invalid");
  if (!Number.isInteger(event.sequence) || event.sequence < 1) throw new TypeError("sequence must be >= 1");
  if (!Number.isInteger(event.lamport) || event.lamport < 0) throw new TypeError("lamport must be >= 0");
  if (!RULESET_VERSION.test(event.ruleset_version)) throw new TypeError("ruleset_version is invalid");
  assertPlainObject(event.payload, "payload");
  assertPlainObject(event.metadata, "metadata");

  for (const key of ["command_id", "correlation_id"]) {
    if (Object.hasOwn(event, key) && (typeof event[key] !== "string" || !event[key].trim())) {
      throw new TypeError(`${key} must be a non-empty string`);
    }
  }
  if (Object.hasOwn(event, "causation_event_id") && !EVENT_ID.test(event.causation_event_id)) {
    throw new TypeError("causation_event_id is invalid");
  }

  normalizeCanonical(event);
  return event;
}

function compareEventOrder(left, right) {
  if (left.lamport !== right.lamport) return left.lamport - right.lamport;
  return left.event_id.localeCompare(right.event_id);
}

export function canonicalJson(value) {
  return JSON.stringify(normalizeCanonical(value));
}

export function validateWorldBackup(backup) {
  assertPlainObject(backup, "backup");
  assertExactKeys(backup, BACKUP_KEYS, "backup");

  if (backup.format !== "ssi-world-backup") throw new TypeError("backup format is invalid");
  if (backup.format_version !== 1) throw new TypeError("backup format_version is invalid");
  if (!WORLD_ID.test(backup.world_id)) throw new TypeError("backup world_id is invalid");
  if (!PRODUCT_VERSION.test(backup.product_version)) throw new TypeError("backup product_version is invalid");
  if (!SHA256_HEX.test(backup.content_lock_fingerprint)) throw new TypeError("content_lock_fingerprint is invalid");
  if (!Number.isInteger(backup.event_count) || backup.event_count < 0) throw new TypeError("event_count is invalid");
  if (!Array.isArray(backup.events)) throw new TypeError("events must be an array");
  if (backup.event_count !== backup.events.length) throw new TypeError("event_count does not match events");

  const seen = new Set();
  let previous = null;
  let lastSequence = 0;
  let lastLamport = -1;
  for (const event of backup.events) {
    validateEventEnvelope(event);
    if (seen.has(event.event_id)) throw new TypeError("event_id must be unique");
    seen.add(event.event_id);
    if (previous !== null && compareEventOrder(previous, event) > 0) {
      throw new TypeError("events are not in deterministic world order");
    }
    if (event.sequence <= lastSequence) {
      throw new TypeError("event sequence must strictly increase");
    }
    if (event.lamport < lastLamport) {
      throw new TypeError("event lamport must not decrease");
    }
    previous = event;
    lastSequence = event.sequence;
    lastLamport = event.lamport;
  }

  normalizeCanonical(backup);
  return backup;
}

export function createWorldBackup({ worldId, productVersion, contentLockFingerprint, events }) {
  const backup = {
    format: "ssi-world-backup",
    format_version: 1,
    world_id: worldId,
    product_version: productVersion,
    content_lock_fingerprint: contentLockFingerprint,
    event_count: Array.isArray(events) ? events.length : -1,
    events: Array.isArray(events) ? events.map(event => normalizeCanonical(event)) : events,
  };
  validateWorldBackup(backup);
  return deepFreeze(backup);
}

export function serializeWorldBackup(backup) {
  validateWorldBackup(backup);
  return canonicalJson(backup);
}

export async function exportWorldBackup({ worldId, productVersion, contentLockFingerprint, readWorld }) {
  if (typeof readWorld !== "function") throw new TypeError("readWorld must be a function");
  const events = await readWorld(worldId);
  if (!Array.isArray(events)) throw new TypeError("readWorld must return an event array");
  const backup = createWorldBackup({
    worldId,
    productVersion,
    contentLockFingerprint,
    events,
  });
  return Object.freeze({
    backup,
    text: serializeWorldBackup(backup),
  });
}
