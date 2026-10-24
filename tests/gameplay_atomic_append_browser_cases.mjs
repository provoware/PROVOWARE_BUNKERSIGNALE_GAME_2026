import { createGameplayAtomicAppender } from "../app/infrastructure/browser/gameplay-atomic-append.mjs";
import { createIndexedDbEventStore } from "../app/infrastructure/browser/indexeddb-event-store.js";

const id = (kind, number) => kind + ":" + number.toString(16).padStart(24, "0");
const world = id("world", 1), otherWorld = id("world", 2), actor = id("actor", 1);
const makeEvent = (n, sequence = n, lamport = n, request = n, version = "1.0.0") => ({
  event_id: id("event", n), event_type: "game.object_inspected", payload: { object_id: id("object", 1) },
  author_id: actor, sequence, lamport, ruleset_version: version, metadata: {}, command_id: id("req", request),
});
const opts = (sequence = 0, lamport = 0) => ({ expected_sequence: sequence, previous_lamport: lamport });
const check = (condition, message) => { if (!condition) throw new Error(message); };
async function rejectCode(work, code) {
  let caught;
  try { await work(); } catch (error) { caught = error; }
  check(caught, "Expected rejection: " + code);
  if (code) check(caught.code === code, "Expected " + code + ", got " + caught.code + ": " + caught.message);
}

export async function runGameplayAtomicAppendSmoke() {
  const dbName = "gameplay-atomic-" + crypto.randomUUID();
  const store = createIndexedDbEventStore({ indexedDB, dbName });
  const writer = createGameplayAtomicAppender({ indexedDB, dbName });
  let passed = 0;
  const verify = async (description, run) => { await run(); passed++; };
  const read = w => store.readWorld(w);
  try {
    await verify("uninitialized I08 store fails closed", async () => {
      await rejectCode(() => writer.append(world, [makeEvent(1)], opts()), "I08_STORE_NOT_READY");
    });
    await verify("I08 bootstrap and empty-world atomic batch", async () => {
      await store.append(otherWorld, [makeEvent(900, 1, 0, 900)]);
      const result = await writer.append(world, [makeEvent(1), makeEvent(2)], opts());
      check(result.ok && result.count === 2, "Initial batch did not commit");
      check((await read(world)).length === 2, "Initial batch missing");
    });
    await verify("stale sequence rejected without mutation", async () => {
      await rejectCode(() => writer.append(world, [makeEvent(3)], opts(0, 0)), "STALE_SEQUENCE");
      check((await read(world)).length === 2, "Stale sequence wrote data");
    });
    await verify("stale Lamport rejected without mutation", async () => {
      await rejectCode(() => writer.append(world, [makeEvent(3)], opts(2, 0)), "STALE_LAMPORT");
      check((await read(world)).length === 2, "Stale Lamport wrote data");
    });
    await verify("duplicate request after reopen rejected", async () => {
      const reopened = createGameplayAtomicAppender({ indexedDB, dbName });
      await rejectCode(() => reopened.append(world, [makeEvent(3, 3, 3, 1)], opts(2, 2)), "DUPLICATE_REQUEST");
      check((await read(world)).length === 2, "Replay wrote data");
    });
    await verify("duplicate event ID in another world aborts batch", async () => {
      await rejectCode(() => writer.append(world, [makeEvent(3), makeEvent(900, 4, 4, 4)], opts(2, 2)), null);
      check((await read(world)).length === 2, "Global ID collision partially committed");
    });
    await verify("two concurrent writers: only one can win", async () => {
      const second = createGameplayAtomicAppender({ indexedDB, dbName });
      const results = await Promise.allSettled([
        writer.append(world, [makeEvent(3)], opts(2, 2)),
        second.append(world, [makeEvent(4, 3, 3, 4)], opts(2, 2)),
      ]);
      check(results.filter(r => r.status === "fulfilled").length === 1, "Concurrent write was not serialized");
      check((await read(world)).length === 3, "Concurrent writes did not preserve one event");
    });
    await verify("injected transaction abort rolls back entire batch", async () => {
      const records = await read(world), last = records.at(-1);
      const injected = createGameplayAtomicAppender({ indexedDB, dbName, faultInjector: ({ writeCount, transaction }) => {
        if (writeCount === 1) transaction.abort();
      } });
      await rejectCode(() => injected.append(world, [makeEvent(5, last.sequence + 1, last.lamport + 1, 5),
        makeEvent(6, last.sequence + 2, last.lamport + 2, 6)], opts(last.sequence, last.lamport)), "GAMEPLAY_TRANSACTION_ABORTED");
      check((await read(world)).length === 3, "Aborted transaction leaked event");
    });
    await verify("invalid clone input fails before write", async () => {
      const last = (await read(world)).at(-1);
      const invalid = makeEvent(7, last.sequence + 1, last.lamport + 1, 7);
      invalid.payload.bad = () => {};
      await rejectCode(() => writer.append(world, [invalid], opts(last.sequence, last.lamport)), "UNCLONEABLE_GAMEPLAY_EVENT");
      check((await read(world)).length === 3, "Invalid clone leaked event");
    });
    await verify("mixed ruleset version fails without write", async () => {
      const last = (await read(world)).at(-1);
      await rejectCode(() => writer.append(world, [makeEvent(7, last.sequence + 1, last.lamport + 1, 7, "2.0.0")],
        opts(last.sequence, last.lamport)), "RULESET_MISMATCH");
    });
    await verify("legacy history without command ID cannot bypass idempotency", async () => {
      const legacyWorld = id("world", 3);
      const legacy = makeEvent(801, 1, 1, 801); delete legacy.command_id;
      await store.append(legacyWorld, [legacy]);
      await rejectCode(() => writer.append(legacyWorld, [makeEvent(802, 2, 2, 802)], opts(1, 1)), "INVALID_WORLD_HISTORY");
      check((await read(legacyWorld)).length === 1, "Legacy guard modified history");
    });
    await verify("different world can append independently", async () => {
      const isolated = id("world", 4);
      await writer.append(isolated, [makeEvent(700, 1, 1, 700)], opts());
      check((await read(isolated)).length === 1, "Independent world not saved");
    });
    await verify("reopen preserves exact accepted event stream", async () => {
      const a = await read(world);
      const b = await createIndexedDbEventStore({ indexedDB, dbName }).readWorld(world);
      check(JSON.stringify(a) === JSON.stringify(b), "Reopen changed persisted events");
      check(a.length === 3, "Unexpected final event count");
    });
    await verify("duplicate requests in same batch rejected before transaction", async () => {
      const last = (await read(world)).at(-1);
      await rejectCode(() => writer.append(world, [makeEvent(7, last.sequence + 1, last.lamport + 1, 7),
        makeEvent(8, last.sequence + 2, last.lamport + 2, 7)], opts(last.sequence, last.lamport)), "INVALID_GAMEPLAY_EVENT");
    });
    await verify("empty batch and bad world rejected", async () => {
      await rejectCode(() => writer.append(world, [], opts()), "INVALID_GAMEPLAY_BATCH");
      await rejectCode(() => writer.append("world:bad", [makeEvent(9)], opts()), "INVALID_GAMEPLAY_APPEND");
    });
    return { passed, finalWorldEvents: (await read(world)).length };
  } finally {
    // Test data only: uniquely named temporary IndexedDB database.
    indexedDB.deleteDatabase(dbName);
  }
}
