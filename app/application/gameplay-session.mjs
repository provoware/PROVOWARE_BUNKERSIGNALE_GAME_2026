import { replayGameplayEvents } from "../domain/gameplay-event-replay.mjs";
import { prepareGameplayEventBatch } from "../domain/gameplay-event-draft.mjs";

const failure = (code, index = null) => Object.assign(new Error(code), {
  code, ...(index === null ? {} : { failed_index: index }),
});

/**
 * Opt-in gameplay read/replay/prepare/commit boundary. The authoritative history
 * is always reread before a command, never taken from an untrusted UI snapshot.
 * The atomic appender MUST reject concurrent changes between read and commit.
 */
export function createGameplaySession({ eventStore, appender, initialState } = {}) {
  if (typeof eventStore?.readWorld !== "function" || typeof appender?.append !== "function") {
    throw new TypeError("Gameplay session requires eventStore.readWorld and appender.append");
  }
  const check = replayGameplayEvents(initialState, []);
  if (!check.ok) throw new TypeError("Invalid initial gameplay state");
  const initial = structuredClone(initialState);
  const worldId = initial.world_id;

  async function read() {
    const events = await eventStore.readWorld(worldId);
    const result = replayGameplayEvents(initial, events);
    if (!result.ok) throw failure(result.code, result.failed_index ?? null);
    return result;
  }

  async function submitBatch(commands, eventIds) {
    const current = await read();
    const prepared = prepareGameplayEventBatch(current.state, commands, {
      event_ids: eventIds, previous_lamport: current.last_lamport,
    });
    if (!prepared.ok) throw failure(prepared.code, prepared.failed_index ?? null);
    await appender.append(worldId, prepared.events, {
      expected_sequence: current.state.sequence, previous_lamport: current.last_lamport,
      // Do not trust the earlier read: another writer may replace an event while
      // keeping its sequence/Lamport unchanged. The atomic appender invokes this
      // synchronously against the history read in its own write transaction.
      verify_history(history, proposed) {
        const verified = replayGameplayEvents(initial, [...history, ...proposed]);
        if (!verified.ok) throw failure(verified.code, verified.failed_index ?? null);
        return true;
      },
    });
    return { ok: true, count: prepared.events.length, state: prepared.next_state };
  }

  return Object.freeze({ read, submitBatch });
}
