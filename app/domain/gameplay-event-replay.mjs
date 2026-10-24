import { projectGameplayCommand } from "./gameplay-projection.mjs";
import { isValidGameplaySnapshot } from "./gameplay-command.mjs";

const EVENT_ID = /^event:[0-9a-f]{24}$/;
const REQUEST_ID = /^req:[0-9a-f]{24}$/;
const TYPES = Object.freeze({
  "game.object_inspected": ["inspect", ["object_id"]],
  "game.object_taken": ["take", ["object_id"]],
  "game.dialogue_selected": ["talk", ["target_actor_id", "option_id"]],
  "game.sector_entered": ["move", ["from_sector", "to_sector"]],
});
const FIELDS = ["event_id", "event_type", "payload", "author_id", "sequence", "lamport",
  "ruleset_version", "metadata", "command_id"];
const fail = (code, index = null) => Object.freeze(index === null ?
  { ok: false, code } : { ok: false, code, failed_index: index });
const plain = value => value !== null && typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
function dataOnly(value, keys) {
  if (!plain(value) || Reflect.ownKeys(value).length !== keys.length) return false;
  return keys.every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && descriptor.enumerable && Object.hasOwn(descriptor, "value");
  });
}
function safeTree(value, seen = new Set(), depth = 0, budget = { count: 0 }) {
  if (++budget.count > 20000 || depth > 12) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value) && Number.isSafeInteger(value);
  if (typeof value !== "object" || seen.has(value)) return false;
  if (!Array.isArray(value) && !plain(value)) return false;
  seen.add(value);
  const keys = Reflect.ownKeys(value);
  if (keys.some(key => typeof key !== "string" || key === "__proto__" || key === "constructor" || key === "prototype")) return false;
  if (Array.isArray(value) && (value.length > 10000 || keys.length !== value.length + 1)) return false;
  for (const key of keys) {
    if (key === "length" && Array.isArray(value)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value") ||
        !safeTree(descriptor.value, seen, depth + 1, budget)) return false;
  }
  seen.delete(value);
  return true;
}
function eventCommand(event, state) {
  const entry = Object.hasOwn(TYPES, event.event_type) ? TYPES[event.event_type] : null;
  if (!entry || !dataOnly(event.payload, entry[1]) || !dataOnly(event.metadata, [])) return null;
  const [action, keys] = entry;
  if (!keys.every(key => typeof event.payload[key] === "string")) return null;
  const command = {
    world_id: state.world_id, actor_id: event.author_id, action,
    target_id: action === "move" ? event.payload.to_sector :
      action === "talk" ? event.payload.target_actor_id : event.payload.object_id,
    expected_sequence: state.sequence, ruleset_version: event.ruleset_version,
    request_id: event.command_id,
  };
  if (action === "talk") command.option_id = event.payload.option_id;
  if (action === "move" && event.payload.from_sector !== state.current_sector) return null;
  return command;
}

/**
 * Opt-in I07-style GAME-01..04 replay. The I07 frozen generic reducer is untouched.
 * Only a fully validated history produces a state. Unknown events and forged
 * effects fail closed; no storage, clock, randomness or caller mutation occurs.
 */
export function replayGameplayEvents(initialState, rawEvents) {
  try {
    if (!safeTree(initialState) || !isValidGameplaySnapshot(initialState) ||
        initialState.sequence !== 0 || initialState.processed_request_ids.length !== 0) {
      return fail("INVALID_INITIAL_GAMEPLAY_STATE");
    }
    if (!Array.isArray(rawEvents) || rawEvents.length > 10000) return fail("INVALID_GAMEPLAY_HISTORY");
    let state = structuredClone(initialState);
    let lastLamport = 0;
    const eventIds = new Set();
    for (let index = 0; index < rawEvents.length; index++) {
      const event = rawEvents[index];
      if (!dataOnly(event, FIELDS) || typeof event.event_id !== "string" ||
          !EVENT_ID.test(event.event_id) || typeof event.command_id !== "string" ||
          !REQUEST_ID.test(event.command_id) || !safeTree(event) ||
          !Number.isSafeInteger(event.sequence) || event.sequence !== state.sequence + 1 ||
          !Number.isSafeInteger(event.lamport) || event.lamport !== lastLamport + 1 ||
          event.ruleset_version !== state.ruleset_version || eventIds.has(event.event_id)) {
        return fail("INVALID_GAMEPLAY_HISTORY", index);
      }
      const command = eventCommand(event, state);
      if (!command) return fail("INVALID_GAMEPLAY_HISTORY", index);
      const projected = projectGameplayCommand(state, command);
      if (!projected.ok) return fail("REPLAY_RULE_REJECTED", index);
      const expected = projected.proposal;
      if (event.event_type !== expected.event_type ||
          Object.keys(expected.payload).some(key => event.payload[key] !== expected.payload[key])) {
        return fail("FORGED_GAMEPLAY_EFFECT", index);
      }
      eventIds.add(event.event_id);
      state = projected.next_state;
      lastLamport = event.lamport;
    }
    return { ok: true, state, last_lamport: lastLamport };
  } catch {
    return fail("INVALID_GAMEPLAY_HISTORY");
  }
}
