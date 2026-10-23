import { decideGameplayCommand } from "./gameplay-command.mjs";

const failure = (code, failed_index = null) => Object.freeze(
  failed_index === null ? { ok: false, code } : { ok: false, code, failed_index },
);

/**
 * Pure preview of a single gameplay command. Not an I06 event, I07 authoritative
 * reducer, IndexedDB append, or save state. Only accepted commands advance the
 * temporary sequence; the storage owner must recheck sequence and request ID
 * atomically before committing a real event.
 */
export function projectGameplayCommand(snapshot, command) {
  let decision;
  try {
    decision = decideGameplayCommand(command, snapshot);
  } catch {
    return failure("INVALID_SNAPSHOT");
  }
  if (!decision.ok) return decision;
  if (snapshot.sequence === Number.MAX_SAFE_INTEGER) return failure("SEQUENCE_EXHAUSTED");

  // Copy only the validated projection contract; no caller object is mutated.
  const next = {
    world_id: snapshot.world_id,
    ruleset_version: snapshot.ruleset_version,
    sequence: snapshot.sequence + 1,
    current_sector: snapshot.current_sector,
    active_actor_id: snapshot.active_actor_id,
    inventory_capacity: snapshot.inventory_capacity,
    actors: snapshot.actors.map(a => ({
      id: a.id, sector: a.sector, dialogue_options: [...a.dialogue_options],
    })),
    objects: snapshot.objects.map(o => ({
      id: o.id, sector: o.sector, inspectable: o.inspectable,
      portable: o.portable, used: o.used,
    })),
    routes: snapshot.routes.map(r => ({ from: r.from, to: r.to, unlocked: r.unlocked })),
    inventory: [...snapshot.inventory],
    processed_request_ids: [...snapshot.processed_request_ids, command.request_id],
  };
  if (command.action === "move") {
    next.current_sector = command.target_id;
    next.actors.find(a => a.id === command.actor_id).sector = command.target_id;
  } else if (command.action === "take") {
    next.inventory.push(command.target_id);
  }
  return { ok: true, next_state: next, proposal: decision.proposal };
}

/** All-or-nothing in-memory replay preview; never publishes partial progress. */
export function previewGameplayCommands(initialSnapshot, commands) {
  if (!Array.isArray(commands)) return failure("INVALID_COMMAND_BATCH");
  let current = initialSnapshot;
  const proposals = [];
  for (let i = 0; i < commands.length; i++) {
    const result = projectGameplayCommand(current, commands[i]);
    if (!result.ok) return failure(result.code, i);
    current = result.next_state;
    proposals.push(result.proposal);
  }
  // Empty batches are not a validation bypass: they have no useful preview.
  if (commands.length === 0) return failure("INVALID_COMMAND_BATCH");
  return { ok: true, next_state: current, proposals };
}
