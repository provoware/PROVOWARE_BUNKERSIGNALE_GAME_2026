const WORLD_ID = /^world:[0-9a-f]{24}$/;
const EVENT_ID = /^event:[0-9a-f]{24}$/;
const ACTOR_ID = /^actor:[0-9a-f]{24}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const KEY_ID = /^key:sha256:[0-9a-f]{64}$/;
const SIGNATURE_BASE64URL = /^[A-Za-z0-9_-]{85}[AQgw]$/;
const EVENT_SIGNATURE_KEYS = Object.freeze([
  "format", "format_version", "world_id", "event_id", "author_id", "key_id", "algorithm", "signature",
]);

const encoder = new TextEncoder();
const LF = new Uint8Array([10]);
const SIGNATURE_DOMAIN = encoder.encode("provoware:i12:event-signature:v1\n");
const KEY_ID_DOMAIN = encoder.encode("provoware:i12:key-id:v1\n");

function concat(...parts) {
  const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}

function assertBytes(value, label) {
  if (!(value instanceof Uint8Array)) throw new TypeError(`${label} must be Uint8Array`);
}

function assertExactKeys(value, expected, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new TypeError(`${label} has missing or unexpected fields`);
  }
}

function signatureInput({ worldId, event, chainEntry, eventBytes, i11Verified }) {
  if (i11Verified !== true) throw new TypeError("successful I11 verification is required");
  if (!event || chainEntry?.event_id !== event.event_id) throw new TypeError("I11 chain entry does not match event");
  return frameEventSignatureInput({
    worldId,
    previousHash: chainEntry.previous_hash,
    eventHash: chainEntry.event_hash,
    eventBytes,
  });
}

export function frameEventSignatureInput({ worldId, previousHash, eventHash, eventBytes }) {
  if (!WORLD_ID.test(worldId)) throw new TypeError("world_id is invalid");
  if (!SHA256_HEX.test(previousHash)) throw new TypeError("previous_hash must be lowercase SHA-256 hex");
  if (!SHA256_HEX.test(eventHash)) throw new TypeError("event_hash must be lowercase SHA-256 hex");
  assertBytes(eventBytes, "eventBytes");
  return concat(SIGNATURE_DOMAIN, encoder.encode(worldId), LF, encoder.encode(previousHash), LF, encoder.encode(eventHash), LF, eventBytes);
}

export async function deriveKeyId(publicKeyBytes, { sha256Hex }) {
  assertBytes(publicKeyBytes, "publicKeyBytes");
  if (publicKeyBytes.length !== 32) throw new TypeError("publicKeyBytes must be exactly 32 raw Ed25519 bytes");
  if (typeof sha256Hex !== "function") throw new TypeError("sha256Hex dependency is required");
  const digest = await sha256Hex(concat(KEY_ID_DOMAIN, publicKeyBytes));
  if (!SHA256_HEX.test(digest)) throw new TypeError("sha256Hex returned invalid hash");
  return `key:sha256:${digest}`;
}

export function validateEventSignatureRecord(record, { worldId, event }) {
  assertExactKeys(record, EVENT_SIGNATURE_KEYS, "signature record");
  if (!WORLD_ID.test(record.world_id) || record.world_id !== worldId) return false;
  if (!event || !EVENT_ID.test(event.event_id) || !ACTOR_ID.test(event.author_id)) return false;
  if (record.event_id !== event.event_id || record.author_id !== event.author_id) return false;
  if (!KEY_ID.test(record.key_id)) return false;
  if (record.format !== "ssi-event-signature" || record.format_version !== 1) return false;
  return record.algorithm === "Ed25519" && SIGNATURE_BASE64URL.test(record.signature);
}

export function createEventSignatureRecord({ worldId, event, keyId, signature }) {
  const record = Object.freeze({
    format: "ssi-event-signature", format_version: 1, world_id: worldId,
    event_id: event?.event_id, author_id: event?.author_id, key_id: keyId,
    algorithm: "Ed25519", signature,
  });
  if (!validateEventSignatureRecord(record, { worldId, event })) throw new TypeError("signature record is invalid");
  return record;
}

export async function signEventDetached(context, { signBytes }) {
  if (typeof signBytes !== "function") throw new TypeError("signBytes capability is required");
  const input = signatureInput(context);
  const signature = await signBytes(input);
  return createEventSignatureRecord({ worldId: context.worldId, event: context.event, keyId: context.keyId, signature });
}

export async function verifyEventDetached(record, context, { verifyBytes }) {
  if (context.i11Verified !== true || typeof verifyBytes !== "function") return false;
  try {
    if (!validateEventSignatureRecord(record, { worldId: context.worldId, event: context.event })) return false;
    const input = signatureInput(context);
    return (await verifyBytes(input, record.signature, record.key_id)) === true;
  } catch {
    return false;
  }
}
