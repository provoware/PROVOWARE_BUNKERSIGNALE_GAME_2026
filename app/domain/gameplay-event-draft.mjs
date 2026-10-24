import { projectGameplayCommand } from "./gameplay-projection.mjs";

const EVENT_ID = /^event:[0-9a-f]{24}$/;
const error = (code, failed_index = null) => Object.freeze(
  failed_index === null ? { ok: false, code } : { ok: false, code, failed_index },
);
const plain = value => value !== null && typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

/**
 * Prepare a schema-shaped I06 envelope without assigning authority or writing it.
 * The store owner MUST allocate a globally unique event ID and check the latest
 * sequence, Lamport clock, request ID and event ID in one write transaction.
 */
export function prepareGameplayEvent(snapshot, command, allocation) {
  try {
    if (!plain(allocation) || Object.keys(allocation).length !== 2 ||
        !Object.hasOwn(allocation, "event_id") || !Object.hasOwn(allocation, "previous_lamport") ||
        typeof allocation.event_id !== "string" || !EVENT_ID.test(allocation.event_id) ||
        !Number.isSafeInteger(allocation.previous_lamport) || allocation.previous_lamport < 0) {
      return error("INVALID_EVENT_ALLOCATION");
    }
    if (allocation.previous_lamport === Number.MAX_SAFE_INTEGER) return error("LAMPORT_EXHAUSTED");
  } catch {
    return error("INVALID_EVENT_ALLOCATION");
  }

  const projected = projectGameplayCommand(snapshot, command);
  if (!projected.ok) return projected;
  try {
    const proposal = projected.proposal;
    const event = Object.freeze({
      event_id: allocation.event_id,
      event_type: proposal.event_type,
      payload: Object.freeze({ ...proposal.payload }),
      author_id: proposal.author_id,
      sequence: projected.next_state.sequence,
      lamport: allocation.previous_lamport + 1,
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
    if (!Array.isArray(commands) || commands.length === 0 || !plain(allocation) ||
        Object.keys(allocation).length !== 2 || !Object.hasOwn(allocation, "event_ids") ||
        !Object.hasOwn(allocation, "previous_lamport") || !Array.isArray(allocation.event_ids) ||
        allocation.event_ids.length !== commands.length ||
        !Number.isSafeInteger(allocation.previous_lamport) || allocation.previous_lamport < 0) {
      return error("INVALID_EVENT_BATCH");
    }
    const ids = allocation.event_ids;
    if (!ids.every(id => typeof id === "string" && EVENT_ID.test(id))) {
      return error("INVALID_EVENT_BATCH");
    }
    if (new Set(ids).size !== ids.length) return error("DUPLICATE_EVENT_ID");
    if (commands.length > Number.MAX_SAFE_INTEGER - allocation.previous_lamport) {
      return error("LAMPORT_EXHAUSTED");
    }
    let current = snapshot;
    let lamport = allocation.previous_lamport;
    const events = [];
    for (let index = 0; index < commands.length; index++) {
      const result = prepareGameplayEvent(current, commands[index], {
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
