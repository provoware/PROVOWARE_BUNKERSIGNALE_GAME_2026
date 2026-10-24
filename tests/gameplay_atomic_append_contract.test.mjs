import test from "node:test";
import assert from "node:assert/strict";
import { createGameplayAtomicAppender } from "../app/infrastructure/browser/gameplay-atomic-append.mjs";

const id = (kind, n) => kind + ":" + n.toString(16).padStart(24, "0");
const world = id("world", 1);
const make = (n = 1) => ({ event_id: id("event", n), event_type: "game.object_inspected",
  payload: {}, author_id: id("actor", 1), sequence: n, lamport: n,
  ruleset_version: "1.0.0", metadata: {}, command_id: id("req", n) });
const options = { expected_sequence: 0, previous_lamport: 0 };
const writer = createGameplayAtomicAppender({ indexedDB: { open() { throw Error("NO_IO_ALLOWED"); } } });
const fails = async (events, opts = options, w = world, code) => {
  await assert.rejects(() => writer.append(w, events, opts), error => error.code === code);
};

test("writer requires indexedDB and rejects invalid configuration", () => {
  assert.throws(() => createGameplayAtomicAppender(), /indexedDB capability/);
  assert.throws(() => createGameplayAtomicAppender({ indexedDB: { open() {} }, faultInjector: 3 }), /Invalid writer/);
});
test("world identity and options must be valid data-only objects", async () => {
  await fails([make()], options, "world:bad", "INVALID_GAMEPLAY_APPEND");
  await fails([make()], { ...options, extra: 1 }, world, "INVALID_GAMEPLAY_APPEND");
  await fails([make()], { expected_sequence: -1, previous_lamport: 0 }, world, "INVALID_GAMEPLAY_APPEND");
  const bad = { previous_lamport: 0 };
  Object.defineProperty(bad, "expected_sequence", { enumerable: true, get() { throw Error("hostile"); } });
  await fails([make()], bad, world, "INVALID_GAMEPLAY_APPEND");
});
test("empty and oversized batches rejected before I/O", async () => {
  await fails([], options, world, "INVALID_GAMEPLAY_BATCH");
  await fails(Array.from({ length: 1001 }, () => make()), options, world, "INVALID_GAMEPLAY_BATCH");
});
test("duplicate event IDs and request IDs fail before I/O", async () => {
  const duplicateEvent = make(2); duplicateEvent.event_id = make(1).event_id;
  await fails([make(1), duplicateEvent], options, world, "INVALID_GAMEPLAY_EVENT");
  const duplicateRequest = make(2); duplicateRequest.command_id = make(1).command_id;
  await fails([make(1), duplicateRequest], options, world, "INVALID_GAMEPLAY_EVENT");
});
test("event contract refuses extra fields and malformed IDs", async () => {
  await fails([{ ...make(), world_id: world }], options, world, "INVALID_GAMEPLAY_EVENT");
  await fails([{ ...make(), event_id: 42 }], options, world, "INVALID_GAMEPLAY_EVENT");
  await fails([{ ...make(), command_id: "req:wrong" }], options, world, "INVALID_GAMEPLAY_EVENT");
});
test("uncloneable nested payload rejected before I/O", async () => {
  await fails([{ ...make(), payload: { fn: () => 1 } }], options, world, "UNCLONEABLE_GAMEPLAY_EVENT");
});
test("sequence and lamport overflow rejected before I/O", async () => {
  await fails([make()], { expected_sequence: Number.MAX_SAFE_INTEGER, previous_lamport: 0 }, world, "SEQUENCE_EXHAUSTED");
  await fails([make()], { expected_sequence: 0, previous_lamport: Number.MAX_SAFE_INTEGER }, world, "SEQUENCE_EXHAUSTED");
});
test("top-level hostile event getter cannot be read", async () => {
  const event = make();
  Object.defineProperty(event, "event_id", { enumerable: true, get() { throw Error("hostile"); } });
  await fails([event], options, world, "INVALID_GAMEPLAY_EVENT");
});
