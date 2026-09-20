const WORLD_ID = /^world:[0-9a-f]{24}$/;
const EVENT_ID = /^event:[0-9a-f]{24}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const KEY_ID = /^key:sha256:[0-9a-f]{64}$/;
const SIGNATURE_BASE64URL = /^[A-Za-z0-9_-]{85}[AQgw]$/;
const KEYS = Object.freeze(["format", "format_version", "world_id", "event_count", "head_event_id", "head_hash", "key_id", "algorithm", "signature"]);
const encoder = new TextEncoder();
const DOMAIN = "provoware:i12:world-checkpoint:v1\n";

function exactRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return false;
  const actual = Object.keys(record).sort();
  const expected = [...KEYS].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

export function frameWorldCheckpointInput({ worldId, eventCount, headEventId, headHash }) {
  if (!WORLD_ID.test(worldId)) throw new TypeError("world_id is invalid");
  if (!Number.isSafeInteger(eventCount) || eventCount < 1) throw new TypeError("event_count must be a positive safe integer");
  if (!EVENT_ID.test(headEventId)) throw new TypeError("head_event_id is invalid");
  if (!SHA256_HEX.test(headHash)) throw new TypeError("head_hash must be lowercase SHA-256 hex");
  return encoder.encode(`${DOMAIN}${worldId}\n${eventCount}\n${headEventId}\n${headHash}\n`);
}

export function validateWorldCheckpoint(record) {
  return exactRecord(record) && record.format === "ssi-world-checkpoint" && record.format_version === 1 &&
    WORLD_ID.test(record.world_id) && Number.isSafeInteger(record.event_count) && record.event_count >= 1 &&
    EVENT_ID.test(record.head_event_id) && SHA256_HEX.test(record.head_hash) && KEY_ID.test(record.key_id) &&
    record.algorithm === "Ed25519" && SIGNATURE_BASE64URL.test(record.signature);
}

export async function verifyTrustedCheckpoint(record, actual, { verifyBytes }) {
  if (typeof verifyBytes !== "function" || !validateWorldCheckpoint(record)) return false;
  if (record.world_id !== actual?.worldId || record.event_count !== actual?.eventCount ||
      record.head_event_id !== actual?.headEventId || record.head_hash !== actual?.headHash) return false;
  try {
    const input = frameWorldCheckpointInput({ worldId: record.world_id, eventCount: record.event_count, headEventId: record.head_event_id, headHash: record.head_hash });
    return (await verifyBytes(input, record.signature, record.key_id)) === true;
  } catch {
    return false;
  }
}
