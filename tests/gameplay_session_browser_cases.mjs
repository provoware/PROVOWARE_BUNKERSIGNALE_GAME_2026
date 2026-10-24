import { createIndexedDbEventStore } from "../app/infrastructure/browser/indexeddb-event-store.js";
import { createGameplayAtomicAppender } from "../app/infrastructure/browser/gameplay-atomic-append.mjs";
import { createGameplaySession } from "../app/application/gameplay-session.mjs";

const id = (kind, n) => kind + ":" + n.toString(16).padStart(24, "0");
const world = id("world", 1), actor = id("actor", 1), contact = id("actor", 2), object = id("object", 1);
const req = n => id("req", n), evt = n => id("event", n);
function initial(worldId = world) {
  return { world_id: worldId, ruleset_version: "1.0.0", sequence: 0,
    current_sector: "sector:entry", active_actor_id: actor,
    actors: [{ id: actor, sector: "sector:entry", dialogue_options: [] },
      { id: contact, sector: "sector:entry", dialogue_options: ["dialogue:ask"] }],
    objects: [{ id: object, sector: "sector:entry", inspectable: true, portable: true, used: false }],
    routes: [{ from: "sector:entry", to: "sector:bunker", unlocked: true }],
    inventory: [], inventory_capacity: 1, processed_request_ids: [] };
}
function command(action, target, sequence, n, worldId = world) {
  return { world_id: worldId, actor_id: actor, action, target_id: target,
    expected_sequence: sequence, ruleset_version: "1.0.0", request_id: req(n),
    ...(action === "talk" ? { option_id: "dialogue:ask" } : {}) };
}
const check = (condition, message) => { if (!condition) throw new Error(message); };
async function rejected(work, code) {
  let caught;
  try { await work(); } catch (error) { caught = error; }
  const accepted = Array.isArray(code) ? code : [code];
  check(caught && accepted.includes(caught.code), "Expected " + accepted.join("/") + ", got " + (caught?.code ?? "success"));
}
export async function runGameplaySessionSmoke() {
  const dbName = "gameplay-session-" + crypto.randomUUID();
  const store = createIndexedDbEventStore({ indexedDB, dbName });
  const writer = createGameplayAtomicAppender({ indexedDB, dbName });
  const session = createGameplaySession({ eventStore: store, appender: writer, initialState: initial() });
  let passed = 0;
  const verify = async (name, run) => { await run(); passed++; };
  try {
    await verify("empty I08 world read", async () => {
      const state = await session.read();
      check(state.ok && state.state.sequence === 0, "Empty world invalid");
    });
    await verify("inspect event persisted", async () => {
      const r = await session.submitBatch([command("inspect", object, 0, 1)], [evt(1)]);
      check(r.state.sequence === 1 && (await store.readWorld(world)).length === 1, "Inspect missing");
    });
    await verify("dialogue event persisted", async () => {
      const r = await session.submitBatch([command("talk", contact, 1, 2)], [evt(2)]);
      check(r.state.sequence === 2, "Talk missing");
    });
    await verify("take event persisted", async () => {
      const r = await session.submitBatch([command("take", object, 2, 3)], [evt(3)]);
      check(r.state.inventory[0] === object, "Take missing");
    });
    await verify("move event persisted", async () => {
      const r = await session.submitBatch([command("move", "sector:bunker", 3, 4)], [evt(4)]);
      check(r.state.current_sector === "sector:bunker", "Move missing");
    });
    await verify("reopen rebuilds exact gameplay state", async () => {
      const reopened = createGameplaySession({ eventStore: createIndexedDbEventStore({ indexedDB, dbName }),
        appender: createGameplayAtomicAppender({ indexedDB, dbName }), initialState: initial() });
      const state = await reopened.read();
      check(state.state.sequence === 4 && state.last_lamport === 4 &&
        state.state.inventory[0] === object && state.state.current_sector === "sector:bunker", "Replay mismatch");
    });
    await verify("duplicate request after restart rejected", async () => {
      await rejected(() => session.submitBatch([command("inspect", object, 4, 1)], [evt(5)]), "DUPLICATE_REQUEST");
      check((await store.readWorld(world)).length === 4, "Duplicate wrote event");
    });
    await verify("two concurrent submissions serialize through atomic writer", async () => {
      const a = command("inspect", object, 4, 5), b = command("inspect", object, 4, 6);
      const outcomes = await Promise.allSettled([
        session.submitBatch([a], [evt(5)]),
        createGameplaySession({ eventStore: store, appender: writer, initialState: initial() }).submitBatch([b], [evt(6)]),
      ]);
      check(outcomes.filter(x => x.status === "fulfilled").length === 1, "Concurrent submissions both won");
      check((await store.readWorld(world)).length === 5, "Concurrent history corrupt");
    });
    await verify("injected abort does not publish partial session state", async () => {
      const before = await session.read();
      const injected = createGameplaySession({ eventStore: store, initialState: initial(),
        appender: createGameplayAtomicAppender({ indexedDB, dbName, faultInjector: ({ writeCount, transaction }) => {
          if (writeCount === 1) transaction.abort();
        } }) });
      await rejected(() => injected.submitBatch([command("inspect", object, 5, 7)], [evt(7)]),
        ["GAMEPLAY_TRANSACTION_ABORTED", "GAMEPLAY_TRANSACTION_FAILED"]);
      check((await session.read()).state.sequence === before.state.sequence, "Abort changed world");
    });
    await verify("stale command rejected before mutation", async () => {
      await rejected(() => session.submitBatch([command("inspect", object, 4, 8)], [evt(8)]), "STALE_SEQUENCE");
      check((await store.readWorld(world)).length === 5, "Stale command changed history");
    });
    await verify("forged stored payload blocks replay and new writes", async () => {
      const badWorld = id("world", 3);
      const bad = { event_id: evt(99), event_type: "game.object_inspected",
        payload: { object_id: id("object", 99) }, author_id: actor, sequence: 1, lamport: 1,
        ruleset_version: "1.0.0", metadata: {}, command_id: req(99) };
      await store.append(badWorld, [bad]);
      const broken = createGameplaySession({ eventStore: store, appender: writer, initialState: initial(badWorld) });
      await rejected(() => broken.read(), "REPLAY_RULE_REJECTED");
      await rejected(() => broken.submitBatch([command("inspect", object, 1, 100, badWorld)], [evt(100)]), "REPLAY_RULE_REJECTED");
      check((await store.readWorld(badWorld)).length === 1, "Forged history was modified");
    });
    await verify("different world is unaffected by gameplay history", async () => {
      const isolated = id("world", 4);
      const other = createGameplaySession({ eventStore: store, appender: writer, initialState: initial(isolated) });
      check((await other.read()).state.sequence === 0, "World isolation broken");
      check((await session.read()).state.sequence === 5, "Original world changed");
    });
    await verify("transaction replay catches tampering after a clean pre-read", async () => {
      const tamperedWorld = id("world", 5);
      const good = { event_id: evt(105), event_type: "game.object_inspected",
        payload: { object_id: object }, author_id: actor, sequence: 1, lamport: 1,
        ruleset_version: "1.0.0", metadata: {}, command_id: req(105) };
      const bad = structuredClone(good);
      bad.payload.object_id = id("object", 99);
      await store.append(tamperedWorld, [bad]);
      // A stale or dishonest read adapter supplies the earlier, valid view.
      // The writer must independently validate the real data in its transaction.
      const staleStore = { async readWorld() { return [structuredClone(good)]; } };
      const guarded = createGameplaySession({ eventStore: staleStore, appender: writer,
        initialState: initial(tamperedWorld) });
      await rejected(() => guarded.submitBatch([
        command("inspect", object, 1, 106, tamperedWorld),
      ], [evt(106)]), "GAMEPLAY_HISTORY_CHANGED");
      check((await store.readWorld(tamperedWorld)).length === 1, "Tampered world changed");
    });

    await verify("valid same-clock history replacement cannot silently commit", async () => {
      const target = id("world", 8);
      const good = { event_id: evt(109), event_type: "game.object_inspected",
        payload: { object_id: object }, author_id: actor, sequence: 1, lamport: 1,
        ruleset_version: "1.0.0", metadata: {}, command_id: req(109) };
      const replaced = structuredClone(good);
      replaced.command_id = req(110); // Valid, but not the event that the session saw.
      await store.append(target, [replaced]);
      const staleStore = { async readWorld() { return [structuredClone(good)]; } };
      const guarded = createGameplaySession({ eventStore: staleStore, appender: writer,
        initialState: initial(target) });
      await rejected(() => guarded.submitBatch([
        command("inspect", object, 1, 111, target),
      ], [evt(111)]), "GAMEPLAY_HISTORY_CHANGED");
      const after = await store.readWorld(target);
      check(after.length === 1 && after[0].command_id === replaced.command_id,
        "Valid history swap wrote an event or modified existing data");
    });
    await verify("async replay validator is rejected without a write", async () => {
      const target = id("world", 6);
      const event = { event_id: evt(107), event_type: "game.object_inspected",
        payload: { object_id: object }, author_id: actor, sequence: 1, lamport: 1,
        ruleset_version: "1.0.0", metadata: {}, command_id: req(107) };
      await rejected(() => writer.append(target, [event], {
        expected_sequence: 0, previous_lamport: 0, verify_history: async () => true,
      }), "GAMEPLAY_REPLAY_REJECTED");
      check((await store.readWorld(target)).length === 0, "Async validator committed");
    });
    await verify("validator cannot alter committed event through its copies", async () => {
      const target = id("world", 7);
      const event = { event_id: evt(108), event_type: "game.object_inspected",
        payload: { object_id: object }, author_id: actor, sequence: 1, lamport: 1,
        ruleset_version: "1.0.0", metadata: {}, command_id: req(108) };
      await writer.append(target, [event], {
        expected_sequence: 0, previous_lamport: 0,
        verify_history(history, proposed) {
          check(history.length === 0, "Unexpected history");
          proposed[0].payload.object_id = id("object", 99);
          return true;
        },
      });
      check((await store.readWorld(target))[0].payload.object_id === object,
        "Validator mutated committed event");
    });
    return { passed, finalWorldEvents: (await store.readWorld(world)).length };
  } finally {
    indexedDB.deleteDatabase(dbName);
  }
}
