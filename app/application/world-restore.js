import { canonicalJson, validateWorldBackup } from "./world-backup.js";

export class WorldRestoreError extends Error {
  constructor(code, message, cause = undefined) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "WorldRestoreError";
    this.code = code;
  }
}

function requireFunction(value, name) {
  if (typeof value !== "function") {
    throw new TypeError(`${name} must be a function`);
  }
}

function parseBackupText(backupText) {
  if (typeof backupText !== "string" || backupText.length === 0) {
    throw new WorldRestoreError("SSI-RESTORE-1001", "backupText must be a non-empty string");
  }
  let backup;
  try {
    backup = JSON.parse(backupText);
  } catch (error) {
    throw new WorldRestoreError("SSI-RESTORE-1001", "backup JSON is truncated or invalid", error);
  }
  try {
    validateWorldBackup(backup);
  } catch (error) {
    throw new WorldRestoreError("SSI-RESTORE-1002", "backup contract validation failed", error);
  }
  return backup;
}

function cloneEvents(events) {
  return events.map(event => JSON.parse(canonicalJson(event)));
}

export async function preflightWorldRestore({
  backupText,
  expectedContentLockFingerprint,
  readWorld,
}) {
  requireFunction(readWorld, "readWorld");
  const backup = parseBackupText(backupText);

  if (
    typeof expectedContentLockFingerprint !== "string"
    || backup.content_lock_fingerprint !== expectedContentLockFingerprint
  ) {
    throw new WorldRestoreError("SSI-RESTORE-1003", "content lock fingerprint is incompatible");
  }

  let existing;
  try {
    existing = await readWorld(backup.world_id);
  } catch (error) {
    throw new WorldRestoreError("SSI-RESTORE-1004", "target-world preflight read failed", error);
  }
  if (!Array.isArray(existing)) {
    throw new WorldRestoreError("SSI-RESTORE-1004", "readWorld must return an event array");
  }
  if (existing.length !== 0) {
    throw new WorldRestoreError("SSI-RESTORE-1005", "target world already contains events");
  }

  return Object.freeze({
    world_id: backup.world_id,
    event_count: backup.event_count,
    events: Object.freeze(cloneEvents(backup.events)),
  });
}

export async function restoreWorldBackup({
  backupText,
  expectedContentLockFingerprint,
  readWorld,
  appendWorld,
}) {
  requireFunction(appendWorld, "appendWorld");
  const plan = await preflightWorldRestore({
    backupText,
    expectedContentLockFingerprint,
    readWorld,
  });

  if (plan.event_count === 0) {
    return Object.freeze({
      world_id: plan.world_id,
      event_count: 0,
      status: "restored",
    });
  }

  try {
    await appendWorld(plan.world_id, plan.events);
  } catch (error) {
    throw new WorldRestoreError("SSI-RESTORE-1006", "atomic restore append failed", error);
  }

  return Object.freeze({
    world_id: plan.world_id,
    event_count: plan.event_count,
    status: "restored",
  });
}
