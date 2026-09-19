import { validateWorldBackup } from "./world-backup.js";

function parseBackup(input) {
  if (typeof input !== "string") return input;
  try { return JSON.parse(input); }
  catch { throw new TypeError("backup JSON is invalid"); }
}

export async function restoreWorldBackup({ input, contentLockFingerprint, restoreIfEmpty }) {
  if (typeof contentLockFingerprint !== "string" || !contentLockFingerprint) {
    throw new TypeError("contentLockFingerprint is required");
  }
  if (typeof restoreIfEmpty !== "function") throw new TypeError("restoreIfEmpty must be a function");

  const backup = parseBackup(input);
  validateWorldBackup(backup);
  if (backup.content_lock_fingerprint !== contentLockFingerprint) {
    throw new Error("backup content basis is incompatible");
  }

  await restoreIfEmpty(backup.world_id, backup.events);
  return Object.freeze({ world_id: backup.world_id, event_count: backup.event_count });
}
