import test from "node:test";
import assert from "node:assert/strict";
import { projectGameplayCommand as project, previewGameplayCommands as preview } from "../app/domain/gameplay-projection.mjs";

const id = (kind, n) => kind + ":" + n.toString(16).padStart(24, "0");
const world = id("world", 1), actor = id("actor", 1), contact = id("actor", 2), object = id("object", 1);
const req = n => id("req", n);
function state() {
  return {
    world_id: world, ruleset_version: "1.0.0", sequence: 3,
    current_sector: "sector:entry", active_actor_id: actor,
    actors: [
      { id: actor, sector: "sector:entry", dialogue_options: [] },
      { id: contact, sector: "sector:entry", dialogue_options: ["dialogue:ask"] },
    ],
    objects: [{ id: object, sector: "sector:entry", inspectable: true, portable: true, used: false }],
    routes: [{ from: "sector:entry", to: "sector:bunker", unlocked: true }],
    inventory: [], inventory_capacity: 1, processed_request_ids: [],
  };
}
function cmd(action, target, sequence = 3, request = 1) {
  const c = { world_id: world, actor_id: actor, action, target_id: target,
    expected_sequence: sequence, ruleset_version: "1.0.0", request_id: req(request) };
  if (action === "talk") c.option_id = "dialogue:ask";
  return c;
}
test("inspect: deterministic projection, no original mutation and no event ID", () => {
  const s = state(), c = cmd("inspect", object), before = JSON.stringify([s,c]);
  const first = project(s,c), second = project(s,c);
  assert.deepEqual(first, second);
  assert.equal(first.ok, true);
  assert.equal(first.next_state.sequence, 4);
  assert.deepEqual(first.next_state.processed_request_ids, [req(1)]);
  assert.equal(first.proposal.event_type, "game.object_inspected");
  assert.equal(Object.hasOwn(first.proposal, "event_id"), false);
  assert.equal(JSON.stringify([s,c]), before);
});
test("talk records only temporary sequence/request, not fictional dialogue effects", () => {
  const r = project(state(), cmd("talk", contact));
  assert.equal(r.ok, true);
  assert.equal(r.proposal.event_type, "game.dialogue_selected");
  assert.equal(r.next_state.sequence, 4);
  assert.equal(r.next_state.actors[1].sector, "sector:entry");
});
test("take projects inventory without consuming object or changing source", () => {
  const s = state(), r = project(s, cmd("take", object));
  assert.equal(r.ok, true);
  assert.deepEqual(r.next_state.inventory, [object]);
  assert.equal(r.next_state.objects[0].used, false);
  assert.deepEqual(s.inventory, []);
  assert.equal(project(r.next_state, cmd("take", object, 4, 2)).code, "NOT_ALLOWED");
});
test("move updates both current sector and active actor for later commands", () => {
  const r = project(state(), cmd("move", "sector:bunker"));
  assert.equal(r.ok, true);
  assert.equal(r.next_state.current_sector, "sector:bunker");
  assert.equal(r.next_state.actors[0].sector, "sector:bunker");
  assert.equal(r.next_state.actors[1].sector, "sector:entry");
  assert.equal(project(r.next_state, cmd("inspect", object, 4, 2)).code, "NOT_REACHABLE");
});
test("replayed request and stale sequence cannot project a second transition", () => {
  const r = project(state(), cmd("inspect", object));
  assert.equal(project(r.next_state, cmd("inspect", object, 4)).code, "DUPLICATE_REQUEST");
  assert.equal(project(r.next_state, cmd("inspect", object)).code, "STALE_SEQUENCE");
});
test("batch preview replays several commands without touching original", () => {
  const s = state(), before = JSON.stringify(s);
  const r = preview(s, [cmd("inspect", object), cmd("take", object, 4, 2), cmd("move", "sector:bunker", 5, 3)]);
  assert.equal(r.ok, true);
  assert.equal(r.next_state.sequence, 6);
  assert.equal(r.next_state.current_sector, "sector:bunker");
  assert.deepEqual(r.next_state.inventory, [object]);
  assert.deepEqual(r.next_state.processed_request_ids, [req(1), req(2), req(3)]);
  assert.equal(r.proposals.length, 3);
  assert.equal(JSON.stringify(s), before);
});
test("failed batch returns no partial state or proposals", () => {
  const s = state(), before = JSON.stringify(s);
  const r = preview(s, [cmd("take", object), cmd("take", object, 4, 2)]);
  assert.deepEqual(r, { ok: false, code: "NOT_ALLOWED", failed_index: 1 });
  assert.equal(Object.hasOwn(r, "next_state"), false);
  assert.equal(JSON.stringify(s), before);
});
test("batch rejects duplicates and invalid inputs without throwing", () => {
  assert.deepEqual(preview(state(), []), { ok: false, code: "INVALID_COMMAND_BATCH" });
  assert.deepEqual(preview(state(), null), { ok: false, code: "INVALID_COMMAND_BATCH" });
  const r = preview(state(), [cmd("inspect", object), cmd("inspect", object, 4)]);
  assert.deepEqual(r, { ok: false, code: "DUPLICATE_REQUEST", failed_index: 1 });
});
test("sequence overflow is rejected without publishing state", () => {
  const s = state();s.sequence = Number.MAX_SAFE_INTEGER;
  const c = cmd("inspect", object, Number.MAX_SAFE_INTEGER);
  assert.deepEqual(project(s,c), { ok: false, code: "SEQUENCE_EXHAUSTED" });
});
test("invalid snapshot and invalid command fail closed", () => {
  assert.deepEqual(project(null, cmd("inspect", object)), { ok: false, code: "INVALID_SNAPSHOT" });
  assert.deepEqual(project(state(), { ...cmd("inspect", object), target_id: "../bad" }),
    { ok: false, code: "INVALID_COMMAND" });
});
