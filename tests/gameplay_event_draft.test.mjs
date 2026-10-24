import test from "node:test";
import assert from "node:assert/strict";
import { prepareGameplayEvent as prepare, prepareGameplayEventBatch as batch } from "../app/domain/gameplay-event-draft.mjs";

const id = (kind, n) => kind + ":" + n.toString(16).padStart(24, "0");
const world = id("world", 1), actor = id("actor", 1), contact = id("actor", 2), object = id("object", 1);
const req = n => id("req", n), evt = n => id("event", n);
function state() {
  return {
    world_id: world, ruleset_version: "1.0.0", sequence: 0,
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
function cmd(action, target, sequence = 0, request = 1) {
  const command = { world_id: world, actor_id: actor, action, target_id: target,
    expected_sequence: sequence, ruleset_version: "1.0.0", request_id: req(request) };
  if (action === "talk") command.option_id = "dialogue:ask";
  return command;
}
const alloc = (event = 1, clock = 0) => ({ event_id: evt(event), previous_lamport: clock });

test("I06-shaped draft: exact keys, sequence, lamport and request trace", () => {
  const result = prepare(state(), cmd("inspect", object), alloc());
  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.event), [
    "event_id", "event_type", "payload", "author_id", "sequence", "lamport",
    "ruleset_version", "metadata", "command_id",
  ]);
  assert.deepEqual(result.event, {
    event_id: evt(1), event_type: "game.object_inspected", payload: { object_id: object },
    author_id: actor, sequence: 1, lamport: 1, ruleset_version: "1.0.0",
    metadata: {}, command_id: req(1),
  });
  assert.equal(Object.isFrozen(result.event), true);
  assert.equal(Object.isFrozen(result.event.payload), true);
});
test("four gameplay actions produce stable distinct event drafts", () => {
  for (const [action, target, expected] of [
    ["inspect", object, "game.object_inspected"],
    ["take", object, "game.object_taken"],
    ["talk", contact, "game.dialogue_selected"],
    ["move", "sector:bunker", "game.sector_entered"],
  ]) {
    const result = prepare(state(), cmd(action, target), alloc());
    assert.equal(result.ok, true, action);
    assert.equal(result.event.event_type, expected);
  }
});
test("deterministic draft never mutates command, snapshot or allocation", () => {
  const s = state(), c = cmd("take", object), a = alloc(9, 4);
  const before = JSON.stringify([s,c,a]);
  assert.deepEqual(prepare(s,c,a), prepare(s,c,a));
  assert.equal(JSON.stringify([s,c,a]), before);
});
test("invalid allocation fails closed, including extras and unsafe numbers", () => {
  for (const a of [null, {}, { ...alloc(), extra: true },
    { ...alloc(), event_id: "event:wrong" },
    { ...alloc(), previous_lamport: -1 },
    { ...alloc(), previous_lamport: 0.5 },
    { ...alloc(), previous_lamport: Number.MAX_SAFE_INTEGER + 1 }]) {
    assert.equal(prepare(state(), cmd("inspect", object), a).code, "INVALID_EVENT_ALLOCATION");
  }
});
test("lamport overflow is rejected before any event draft is published", () => {
  assert.deepEqual(prepare(state(), cmd("inspect", object), alloc(1, Number.MAX_SAFE_INTEGER)),
    { ok: false, code: "LAMPORT_EXHAUSTED" });
});
test("stale sequence and duplicate request remain rejected", () => {
  assert.equal(prepare(state(), cmd("inspect", object, 4), alloc()).code, "STALE_SEQUENCE");
  const s = state();s.processed_request_ids.push(req(1));
  assert.equal(prepare(s, cmd("inspect", object), alloc()).code, "DUPLICATE_REQUEST");
});
test("three drafts increment sequence and lamport together", () => {
  const result = batch(state(), [
    cmd("inspect", object), cmd("take", object, 1, 2), cmd("move", "sector:bunker", 2, 3),
  ], { event_ids: [evt(1),evt(2),evt(3)], previous_lamport: 20 });
  assert.equal(result.ok, true);
  assert.deepEqual(result.events.map(e => e.sequence), [1,2,3]);
  assert.deepEqual(result.events.map(e => e.lamport), [21,22,23]);
  assert.deepEqual(result.next_state.inventory, [object]);
  assert.equal(result.next_state.current_sector, "sector:bunker");
});
test("failed batch does not expose partial events or state", () => {
  const s = state(), before = JSON.stringify(s);
  const result = batch(s, [cmd("take", object),cmd("take", object, 1, 2)],
    { event_ids: [evt(1),evt(2)], previous_lamport: 0 });
  assert.deepEqual(result, { ok: false, code: "NOT_ALLOWED", failed_index: 1 });
  assert.equal(JSON.stringify(s), before);
});
test("duplicate event IDs and mismatched batch lengths fail closed", () => {
  assert.deepEqual(batch(state(), [cmd("inspect", object), cmd("take", object, 1, 2)],
    { event_ids: [evt(1),evt(1)], previous_lamport: 0 }),
    { ok: false, code: "DUPLICATE_EVENT_ID" });
  assert.equal(batch(state(), [cmd("inspect", object)],
    { event_ids: [], previous_lamport: 0 }).code, "INVALID_EVENT_BATCH");
});
test("invalid batches and hostile getters do not throw", () => {
  assert.equal(batch(state(), [], { event_ids: [], previous_lamport: 0 }).code, "INVALID_EVENT_BATCH");
  assert.equal(batch(state(), null, { event_ids: [], previous_lamport: 0 }).code, "INVALID_EVENT_BATCH");
  const a = { event_ids: [evt(1)], previous_lamport: 0 };
  Object.defineProperty(a, "previous_lamport", { enumerable: true, get() { throw Error("hostile"); } });
  assert.equal(batch(state(), [cmd("inspect", object)], a).code, "INVALID_EVENT_BATCH");
});
test("batch overflow returns no partially prepared events", () => {
  const r = batch(state(), [cmd("inspect", object),cmd("take", object, 1, 2)],
    { event_ids: [evt(1),evt(2)], previous_lamport: Number.MAX_SAFE_INTEGER - 1 });
  assert.deepEqual(r, { ok: false, code: "LAMPORT_EXHAUSTED" });
});
