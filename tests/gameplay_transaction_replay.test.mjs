import test from "node:test";
import assert from "node:assert/strict";
import { createGameplaySession } from "../app/application/gameplay-session.mjs";
import { createGameplayAtomicAppender } from "../app/infrastructure/browser/gameplay-atomic-append.mjs";

const id = (kind, n) => kind + ":" + n.toString(16).padStart(24, "0");
const world = id("world", 1), actor = id("actor", 1), object = id("object", 1);
const command = n => ({
  world_id: world, actor_id: actor, action: "inspect", target_id: object,
  expected_sequence: 0, ruleset_version: "1.0.0", request_id: id("req", n),
});
function initial() {
  return { world_id: world, ruleset_version: "1.0.0", sequence: 0,
    current_sector: "sector:entry", active_actor_id: actor,
    actors: [{ id: actor, sector: "sector:entry", dialogue_options: [] }],
    objects: [{ id: object, sector: "sector:entry", inspectable: true, portable: true, used: false }],
    routes: [], inventory: [], inventory_capacity: 1, processed_request_ids: [] };
}
const fakeStore = { async readWorld() { return []; } };
function sessionWith(write) {
  return createGameplaySession({ initialState: initial(), eventStore: fakeStore,
    appender: { append: write } });
}
test("session supplies a synchronous verifier for the exact proposed stream", async () => {
  let calls = 0;
  const session = sessionWith(async (worldId, events, options) => {
    calls++;
    assert.equal(worldId, world);
    assert.equal(options.verify_history([], events), true);
    assert.equal(options.expected_sequence, 0);
    assert.equal(options.previous_lamport, 0);
  });
  const result = await session.submitBatch([command(1)], [id("event", 1)]);
  assert.equal(result.state.sequence, 1);
  assert.equal(calls, 1);
});
test("tampered stored payload after the initial read rejects transaction replay", async () => {
  let commits = 0;
  const session = sessionWith(async (_, events, options) => {
    const forged = structuredClone(events[0]);
    forged.payload.object_id = id("object", 99);
    options.verify_history([forged], events);
    commits++;
  });
  await assert.rejects(() => session.submitBatch([command(1)], [id("event", 1)]),
    error => error.code === "REPLAY_RULE_REJECTED" && error.failed_index === 0);
  assert.equal(commits, 0);
});
test("tampered proposed event is rejected before commit", async () => {
  let commits = 0;
  const session = sessionWith(async (_, events, options) => {
    const forged = structuredClone(events);
    forged[0].payload.object_id = id("object", 99);
    options.verify_history([], forged);
    commits++;
  });
  await assert.rejects(() => session.submitBatch([command(1)], [id("event", 1)]),
    error => error.code === "REPLAY_RULE_REJECTED" && error.failed_index === 0);
  assert.equal(commits, 0);
});
test("missing, nonfunction and hostile verifier values fail before database access", async () => {
  let opened = 0;
  const writer = createGameplayAtomicAppender({ indexedDB: { open() { opened++; throw Error("NO_IO"); } } });
  const event = { event_id: id("event", 1), event_type: "game.object_inspected",
    payload: { object_id: object }, author_id: actor, sequence: 1, lamport: 1,
    ruleset_version: "1.0.0", metadata: {}, command_id: id("req", 1) };
  const options = { expected_sequence: 0, previous_lamport: 0 };
  for (const verify_history of [null, 0, "yes", {}]) {
    await assert.rejects(() => writer.append(world, [event], { ...options, verify_history }),
      error => error.code === "INVALID_GAMEPLAY_APPEND");
  }
  const hostile = { ...options };
  Object.defineProperty(hostile, "verify_history", { enumerable: true, get() { throw Error("accessor"); } });
  await assert.rejects(() => writer.append(world, [event], hostile),
    error => error.code === "INVALID_GAMEPLAY_APPEND");
  assert.equal(opened, 0);
});
