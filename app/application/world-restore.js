import { validateWorldBackup } from "./world-backup.js";

function parseBackup(input) {
  if (typeof input === "string") {
    try { return JSON.parse(input); }
    catch { throw new TypeError("backup JSON is invalid"); }
  }
  return input;
}

export async function restoreWorldBackup({
  input,
  contentLockFingerprint,
  readWorld,
  append,
}) {
  if (typeof contentLockFingerprint !== "string" || !contentLockFingerprint) {
    throw new TypeError("contentLockFingerprint is required");
  }
  if (typeof readWorld !== "function") throw new TypeError("readWorld must be a function");
  if (typeof append !== "function") throw new TypeError("append must be a function");

  const backup = parseBackup(input);
  validateWorldBackup(backup);
  if (backup.content_lock_fingerprint !== contentLockFingerprint) {
    throw new Error("backup content basis is incompatible");
  }

  const existing = await readWorld(backup.world_id);
  if (!Array.isArray(existing)) throw new TypeError("readWorld must return an event array");
  if (existing.length !== 0) throw new Error("restore target is not empty");

  if (backup.events.length !== 0) {
    await append(backup.world_id, backup.events);
  }
  return Object.freeze({ world_id: backup.world_id, event_count: backup.event_count });
}
