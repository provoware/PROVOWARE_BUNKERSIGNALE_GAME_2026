import { projectGameplayCommand } from "./gameplay-projection.mjs";

const EVENT_ID = /^event:[0-9a-f]{24}$/;
const error = (code, failed_index = null) => Object.freeze(
  failed_index === null ? { ok: false, code } : { ok: false, code, failed_index },
);
const plain = value => value !== null && typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const dataFields = (value, names) => {
  if (!plain(value) || Object.keys(value).length !== names.length) return null;
  const descriptors = names.map(name => Object.getOwnPropertyDescriptor(value, name));
  if (descriptors.some(descriptor => !descriptor || !Object.hasOwn(descriptor, "value"))) return null;
  return descriptors.map(descriptor => descriptor.value);
};

/**
 * Prepare a schema-shaped I06 envelope without assigning authority or writing it.
 * The store owner MUST allocate a globally unique event ID and check the latest
 * sequence, Lamport clock, request ID and event ID in one write transaction.
 */
export function prepareGameplayEvent(snapshot, command, allocation) {
  let eventId, previousLamport;
  try {
    const fields = dataFields(allocation, ["event_id", "previous_lamport"]);
    if (!fields) return error("INVALID_EVENT_ALLOCATION");
    [eventId, previousLamport] = fields;
    if (typeof eventId !== "string" || !EVENT_ID.test(eventId) ||
        !Number.isSafeInteger(previousLamport) || previousLamport < 0) {
      return error("INVALID_EVENT_ALLOCATION");
    }
    if (previousLamport === Number.MAX_SAFE_INTEGER) return error("LAMPORT_EXHAUSTED");
  } catch {
    return error("INVALID_EVENT_ALLOCATION");
  }

  const projected = projectGameplayCommand(snapshot, command);
  if (!projected.ok) return projected;
  try {
    const proposal = projected.proposal;
    const event = Object.freeze({
      event_id: eventId,
      event_type: proposal.event_type,
      payload: Object.freeze({ ...proposal.payload }),
      author_id: proposal.author_id,
      sequence: projected.next_state.sequence,
      lamport: previousLamport + 1,
      ruleset_version: proposal.ruleset_version,
      metadata: Object.freeze({}),
      command_id: proposal.command_id,
    });
    return { ok: true, event, next_state: projected.next_state };
  } catch {
    return error("INVALID_EVENT_ALLOCATION");
  }
}

/**
 * All-or-nothing preparation of a proposed event sequence. No persistent
 * uniqueness, concurrency or recovery guarantee is claimed by this function.
 */
export function prepareGameplayEventBatch(snapshot, commands, allocation) {
  try {
    const fields = dataFields(allocation, ["event_ids", "previous_lamport"]);
    if (!Array.isArray(commands) || !fields || !Array.isArray(fields[0]) ||
        !Number.isSafeInteger(fields[1]) || fields[1] < 0) {
      return error("INVALID_EVENT_BATCH");
    }
    // Snapshot each collection once: accessors cannot swap values after validation.
    const commandList = [...commands];
    const ids = [...fields[0]];
    const previousLamport = fields[1];
    if (commandList.length === 0 || ids.length !== commandList.length) {
      return error("INVALID_EVENT_BATCH");
    }
    if (!ids.every(id => typeof id === "string" && EVENT_ID.test(id))) {
      return error("INVALID_EVENT_BATCH");
    }
    if (new Set(ids).size !== ids.length) return error("DUPLICATE_EVENT_ID");
    if (commandList.length > Number.MAX_SAFE_INTEGER - previousLamport) {
      return error("LAMPORT_EXHAUSTED");
    }
    let current = snapshot;
    let lamport = previousLamport;
    const events = [];
    for (let index = 0; index < commandList.length; index++) {
      const result = prepareGameplayEvent(current, commandList[index], {
        event_id: ids[index], previous_lamport: lamport,
      });
      if (!result.ok) return error(result.code, index);
      events.push(result.event);
      current = result.next_state;
      lamport = result.event.lamport;
    }
    return { ok: true, events: Object.freeze(events), next_state: current };
  } catch {
    return error("INVALID_EVENT_BATCH");
  }
}
