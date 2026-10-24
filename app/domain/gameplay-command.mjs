// Pure, read-only GAME-01..04 command preflight. No event IDs or writes are allocated here.
const WORLD = /^world:[0-9a-f]{24}$/;
const ACTOR = /^actor:[0-9a-f]{24}$/;
const OBJECT = /^object:[0-9a-f]{24}$/;
const SECTOR = /^sector:[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUEST = /^req:[0-9a-f]{24}$/;
const OPTION = /^dialogue:[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const ACTIONS = new Set(["inspect", "talk", "take", "move"]);
const REQUIRED = ["world_id", "actor_id", "action", "target_id", "expected_sequence", "ruleset_version", "request_id"];

const plain = value => value !== null && typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const unique = items => new Set(items).size === items.length;
const validString = (value, regex) => typeof value === "string" && regex.test(value);
const resultError = code => Object.freeze({ ok: false, code });
const validIds = (items, regex) => items.every(item => validString(item, regex)) && unique(items);

function validSnapshot(s) {
  if (!plain(s) || !validString(s.world_id, WORLD) || !validString(s.ruleset_version, VERSION) ||
      !Number.isSafeInteger(s.sequence) || s.sequence < 0 || !validString(s.current_sector, SECTOR) ||
      !validString(s.active_actor_id, ACTOR) || !Number.isSafeInteger(s.inventory_capacity) ||
      s.inventory_capacity < 0 || !Array.isArray(s.actors) || !Array.isArray(s.objects) ||
      !Array.isArray(s.routes) || !Array.isArray(s.inventory) || !Array.isArray(s.processed_request_ids)) {
    return false;
  }
  if (!validIds(s.inventory, OBJECT) || s.inventory.length > s.inventory_capacity ||
      !validIds(s.processed_request_ids, REQUEST)) return false;
  if (!s.actors.every(a => plain(a) && validString(a.id, ACTOR) &&
      validString(a.sector, SECTOR) && Array.isArray(a.dialogue_options) &&
      validIds(a.dialogue_options, OPTION)) || !unique(s.actors.map(a => a.id))) return false;
  if (!s.objects.every(o => plain(o) && validString(o.id, OBJECT) &&
      validString(o.sector, SECTOR) && typeof o.inspectable === "boolean" &&
      typeof o.portable === "boolean" && typeof o.used === "boolean") ||
      !unique(s.objects.map(o => o.id))) return false;
  if (!s.inventory.every(id => s.objects.some(o => o.id === id))) return false;
  if (!s.routes.every(r => plain(r) && validString(r.from, SECTOR) &&
      validString(r.to, SECTOR) && typeof r.unlocked === "boolean") ||
      !unique(s.routes.map(r => r.from + ">" + r.to))) return false;
  return s.actors.some(a => a.id === s.active_actor_id && a.sector === s.current_sector);
}

/**
 * Preflight only. Success is a proposal, NOT a persisted I06 event or a committed move.
 * The event-store owner must atomically check expected_sequence/request_id again at append.
 * Neither input is mutated; errors contain only stable codes.
 */
export function decideGameplayCommand(command, snapshot) {
  if (!plain(command)) return resultError("INVALID_COMMAND");
  const keys = Object.keys(command);
  const requiredKeys = command.action === "talk" ? [...REQUIRED, "option_id"] : REQUIRED;
  if (keys.length !== requiredKeys.length || !requiredKeys.every(key => Object.hasOwn(command, key)) ||
      !validString(command.world_id, WORLD) || !validString(command.actor_id, ACTOR) ||
      !ACTIONS.has(command.action) || !validString(command.request_id, REQUEST) ||
      !validString(command.ruleset_version, VERSION) || !Number.isSafeInteger(command.expected_sequence) ||
      command.expected_sequence < 0 || !validString(command.target_id,
        command.action === "talk" ? ACTOR : command.action === "move" ? SECTOR : OBJECT) ||
      (command.action === "talk" && !validString(command.option_id, OPTION))) {
    return resultError("INVALID_COMMAND");
  }
  if (!validSnapshot(snapshot)) return resultError("INVALID_SNAPSHOT");
  if (command.world_id !== snapshot.world_id || command.ruleset_version !== snapshot.ruleset_version) {
    return resultError("WRONG_WORLD_OR_RULESET");
  }
  if (command.expected_sequence !== snapshot.sequence) return resultError("STALE_SEQUENCE");
  if (snapshot.processed_request_ids.includes(command.request_id)) return resultError("DUPLICATE_REQUEST");
  if (command.actor_id !== snapshot.active_actor_id) return resultError("UNAUTHORIZED_ACTOR");

  let type, payload;
  if (command.action === "move") {
    const route = snapshot.routes.find(r => r.from === snapshot.current_sector && r.to === command.target_id);
    if (!route) return resultError("UNKNOWN_ROUTE");
    if (!route.unlocked) return resultError("LOCKED_ROUTE");
    type = "game.sector_entered";
    payload = { from_sector: snapshot.current_sector, to_sector: command.target_id };
  } else if (command.action === "talk") {
    const actor = snapshot.actors.find(a => a.id === command.target_id);
    if (!actor) return resultError("UNKNOWN_TARGET");
    if (actor.sector !== snapshot.current_sector || actor.id === command.actor_id) {
      return resultError("NOT_REACHABLE");
    }
    if (!actor.dialogue_options.includes(command.option_id)) return resultError("INVALID_DIALOGUE_OPTION");
    type = "game.dialogue_selected";
    payload = { target_actor_id: actor.id, option_id: command.option_id };
  } else {
    const object = snapshot.objects.find(o => o.id === command.target_id);
    if (!object) return resultError("UNKNOWN_TARGET");
    const owned = snapshot.inventory.includes(object.id);
    if (!owned && object.sector !== snapshot.current_sector) return resultError("NOT_REACHABLE");
    if (command.action === "inspect") {
      if (!object.inspectable) return resultError("NOT_ALLOWED");
      type = "game.object_inspected";
      payload = { object_id: object.id };
    } else {
      if (owned || object.used || !object.portable) return resultError("NOT_ALLOWED");
      if (snapshot.inventory.length >= snapshot.inventory_capacity) return resultError("INVENTORY_FULL");
      type = "game.object_taken";
      payload = { object_id: object.id };
    }
  }
  return Object.freeze({
    ok: true,
    proposal: Object.freeze({
      event_type: type,
      payload: Object.freeze(payload),
      author_id: command.actor_id,
      ruleset_version: command.ruleset_version,
      command_id: command.request_id,
    }),
  });
}

/** Read-only snapshot contract for gameplay replay, no state mutation. */
export function isValidGameplaySnapshot(snapshot) {
  try { return validSnapshot(snapshot); } catch { return false; }
}
