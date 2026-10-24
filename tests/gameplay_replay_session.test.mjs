import test from "node:test";
import assert from "node:assert/strict";
import { replayGameplayEvents as replay } from "../app/domain/gameplay-event-replay.mjs";
import { prepareGameplayEventBatch as prepare } from "../app/domain/gameplay-event-draft.mjs";
import { createGameplaySession } from "../app/application/gameplay-session.mjs";

const id = (kind, n) => kind + ":" + n.toString(16).padStart(24, "0");
const world = id("world", 1), actor = id("actor", 1), contact = id("actor", 2), object = id("object", 1);
const req = n => id("req", n), evt = n => id("event", n);
function initial() {
  return {
    world_id: world, ruleset_version: "1.0.0", sequence: 0,
    current_sector: "sector:entry", active_actor_id: actor,
    actors: [{ id: actor, sector: "sector:entry", dialogue_options: [] },
      { id: contact, sector: "sector:entry", dialogue_options: ["dialogue:ask"] }],
    objects: [{ id: object, sector: "sector:entry", inspectable: true, portable: true, used: false }],
    routes: [{ from: "sector:entry", to: "sector:bunker", unlocked: true }],
    inventory: [], inventory_capacity: 1, processed_request_ids: [],
  };
}
function command(action, target, sequence, n) {
  return { world_id: world, actor_id: actor, action, target_id: target,
    expected_sequence: sequence, ruleset_version: "1.0.0", request_id: req(n),
    ...(action === "talk" ? { option_id: "dialogue:ask" } : {}) };
}
function fixture() {
  const commands = [command("inspect", object, 0, 1), command("talk", contact, 1, 2),
    command("take", object, 2, 3), command("move", "sector:bunker", 3, 4)];
  const result = prepare(initial(), commands, { event_ids: [evt(1),evt(2),evt(3),evt(4)], previous_lamport: 0 });
  assert.equal(result.ok, true);
  return result;
}
const mutate = (events, index, update) => {
  const copy = structuredClone(events);
  update(copy[index]);
  return copy;
};
test("empty history replays valid initial state without mutation", () => {
  const state = initial(), before = JSON.stringify(state);
  const result = replay(state, []);
  assert.equal(result.ok, true);
  assert.deepEqual(result.state, state);
  assert.notEqual(result.state, state);
  assert.equal(result.last_lamport, 0);
  assert.equal(JSON.stringify(state), before);
});
test("all four gameplay actions replay to the exact projected state", () => {
  const draft = fixture();
  const result = replay(initial(), draft.events);
  assert.equal(result.ok, true);
  assert.deepEqual(result.state, draft.next_state);
  assert.equal(result.last_lamport, 4);
  assert.deepEqual(result.state.inventory, [object]);
  assert.equal(result.state.current_sector, "sector:bunker");
});
test("deterministic replay of the same history has identical result", () => {
  const events = fixture().events;
  assert.deepEqual(replay(initial(), events), replay(initial(), events));
});
test("unknown event type, extra payload and nonempty metadata fail closed", () => {
  const events = fixture().events;
  for (const change of [
    e => { e.event_type = "game.unknown"; },
    e => { e.payload.extra = "bad"; },
    e => { e.metadata.source = "fake"; },
  ]) {
    const result = replay(initial(), mutate(events, 0, change));
    assert.equal(result.ok, false);
    assert.equal(Object.hasOwn(result, "state"), false);
  }
});
test("forged target and forged move origin fail without partial state", () => {
  const events = fixture().events;
  const wrongTarget = replay(initial(), mutate(events, 0, e => { e.payload.object_id = id("object", 99); }));
  assert.equal(wrongTarget.ok, false);
  const wrongFrom = replay(initial(), mutate(events, 3, e => { e.payload.from_sector = "sector:wrong"; }));
  assert.equal(wrongFrom.ok, false);
  assert.equal(wrongFrom.failed_index, 3);
  assert.equal(Object.hasOwn(wrongFrom, "state"), false);
});
test("sequence, Lamport, ruleset and event ID are strictly verified", () => {
  const events = fixture().events;
  for (const change of [
    e => { e.sequence = 8; }, e => { e.lamport = 3; },
    e => { e.ruleset_version = "2.0.0"; }, e => { e.event_id = "event:bad"; },
  ]) {
    assert.equal(replay(initial(), mutate(events, 1, change)).code, "INVALID_GAMEPLAY_HISTORY");
  }
  assert.equal(replay(initial(), mutate(events, 2, e => { e.event_id = evt(1); })).code, "INVALID_GAMEPLAY_HISTORY");
});
test("duplicate request and forged actor cannot replay", () => {
  const events = fixture().events;
  assert.equal(replay(initial(), mutate(events, 2, e => { e.command_id = req(1); })).code, "REPLAY_RULE_REJECTED");
  assert.equal(replay(initial(), mutate(events, 2, e => { e.author_id = contact; })).code, "REPLAY_RULE_REJECTED");
});
test("invalid initial state cannot be promoted to a saved world", () => {
  for (const state of [null, { ...initial(), sequence: 3 }, { ...initial(), processed_request_ids: [req(1)] },
    { ...initial(), actors: [] }, { ...initial(), inventory: ["bad"] }]) {
    assert.equal(replay(state, []).code, "INVALID_INITIAL_GAMEPLAY_STATE");
  }
});
test("hostile getters, symbols, cycles and non-JSON data fail closed", () => {
  const e = structuredClone(fixture().events[0]);
  Object.defineProperty(e, "event_id", { enumerable: true, get() { throw Error("hostile"); } });
  assert.equal(replay(initial(), [e]).ok, false);
  const symbol = structuredClone(fixture().events[0]); symbol[Symbol("hidden")] = true;
  assert.equal(replay(initial(), [symbol]).ok, false);
  const cyclic = initial(); cyclic.self = cyclic;
  assert.equal(replay(cyclic, []).ok, false);
  const nan = structuredClone(fixture().events[0]); nan.payload.invalid = NaN;
  assert.equal(replay(initial(), [nan]).ok, false);
});
test("history length is bounded", () => {
  assert.equal(replay(initial(), Array(10001).fill(null)).code, "INVALID_GAMEPLAY_HISTORY");
});
test("session rereads the authoritative history and persists four actions", async () => {
  const persisted = [];
  const store = { async readWorld() { return structuredClone(persisted); } };
  const writer = { async append(w, events, options) {
    assert.equal(w, world);
    assert.equal(options.expected_sequence, persisted.length);
    assert.equal(options.previous_lamport, persisted.length);
    persisted.push(...structuredClone(events));
  } };
  const session = createGameplaySession({ eventStore: store, appender: writer, initialState: initial() });
  const commands = [command("inspect", object, 0, 1), command("talk", contact, 1, 2),
    command("take", object, 2, 3), command("move", "sector:bunker", 3, 4)];
  const result = await session.submitBatch(commands, [evt(1),evt(2),evt(3),evt(4)]);
  assert.equal(result.ok, true);
  assert.equal(result.count, 4);
  assert.deepEqual((await session.read()).state, result.state);
  assert.equal(persisted.length, 4);
});
test("invalid command does not call writer or expose partial state", async () => {
  let writes = 0;
  const session = createGameplaySession({ initialState: initial(),
    eventStore: { async readWorld() { return []; } },
    appender: { async append() { writes++; } } });
  await assert.rejects(() => session.submitBatch([
    command("take", object, 0, 1), command("take", object, 1, 2),
  ], [evt(1),evt(2)]), error => error.code === "NOT_ALLOWED" && error.failed_index === 1);
  assert.equal(writes, 0);
});
test("corrupt stored history prevents any subsequent write", async () => {
  let writes = 0;
  const corrupted = mutate(fixture().events, 1, e => { e.lamport = 99; });
  const session = createGameplaySession({ initialState: initial(),
    eventStore: { async readWorld() { return corrupted; } },
    appender: { async append() { writes++; } } });
  await assert.rejects(() => session.submitBatch([command("inspect", object, 4, 5)], [evt(5)]),
    error => error.code === "INVALID_GAMEPLAY_HISTORY" && error.failed_index === 1);
  assert.equal(writes, 0);
});
test("session rejects absent capabilities and malformed initial world", () => {
  assert.throws(() => createGameplaySession(), /requires/);
  assert.throws(() => createGameplaySession({ eventStore: { readWorld() {} },
    appender: { append() {} }, initialState: { ...initial(), sequence: 1 } }), /Invalid initial/);
});
