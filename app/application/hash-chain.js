const GENESIS_HASH = "0".repeat(64);
const SHA256_HEX = /^[0-9a-f]{64}$/;
const DOMAIN = new TextEncoder().encode("provoware:i11:hash-chain:v1\n");
const LF = new Uint8Array([10]);

function concat(...parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

export function frameHashInput(previousHash, eventBytes) {
  if (!SHA256_HEX.test(previousHash)) throw new TypeError("previous_hash must be lowercase SHA-256 hex");
  if (!(eventBytes instanceof Uint8Array)) throw new TypeError("eventBytes must be Uint8Array");
  return concat(DOMAIN, new TextEncoder().encode(previousHash), LF, eventBytes);
}

function assertOrdered(events) {
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (!Number.isInteger(event.sequence) || event.sequence < 1) throw new TypeError("event sequence is invalid");
    if (index === 0) continue;
    const previous = events[index - 1];
    if (event.sequence <= previous.sequence) throw new TypeError("event sequence must strictly increase");
    if (event.lamport < previous.lamport ||
        (event.lamport === previous.lamport && event.event_id < previous.event_id)) {
      throw new TypeError("events are not in deterministic world order");
    }
  }
}

export async function buildHashChain(events, { canonicalEventBytes, sha256Hex }) {
  if (!Array.isArray(events)) throw new TypeError("events must be an array");
  if (typeof canonicalEventBytes !== "function" || typeof sha256Hex !== "function") {
    throw new TypeError("hash-chain dependencies are required");
  }
  assertOrdered(events);
  const chain = [];
  let previousHash = GENESIS_HASH;
  for (const event of events) {
    const eventHash = await sha256Hex(frameHashInput(previousHash, canonicalEventBytes(event)));
    if (!SHA256_HEX.test(eventHash)) throw new TypeError("sha256Hex returned invalid hash");
    chain.push(Object.freeze({ sequence: event.sequence, event_id: event.event_id, previous_hash: previousHash, event_hash: eventHash }));
    previousHash = eventHash;
  }
  return Object.freeze(chain);
}

export async function verifyHashChain(events, chain, dependencies) {
  if (!Array.isArray(chain) || chain.length !== events.length) return false;
  try {
    const expected = await buildHashChain(events, dependencies);
    return expected.every((item, index) => {
      const actual = chain[index];
      return actual?.sequence === item.sequence && actual?.event_id === item.event_id &&
        actual?.previous_hash === item.previous_hash && actual?.event_hash === item.event_hash;
    });
  } catch {
    return false;
  }
}

export { GENESIS_HASH };
