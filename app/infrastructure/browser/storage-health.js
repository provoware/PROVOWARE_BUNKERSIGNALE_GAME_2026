const ESTIMATE_FAILED = "SSI-STO-1001";
const PERSISTED_FAILED = "SSI-STO-1002";
const INVALID_ESTIMATE = "SSI-STO-1003";

function finiteNonNegative(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function result(values) {
  return Object.freeze(values);
}

async function readPersisted(storageManager) {
  if (typeof storageManager?.persisted !== "function") {
    return { persisted: null, error_code: null };
  }
  try {
    return { persisted: Boolean(await storageManager.persisted()), error_code: null };
  } catch {
    return { persisted: null, error_code: PERSISTED_FAILED };
  }
}

export async function readBrowserStorageHealth({ storageManager = globalThis.navigator?.storage } = {}) {
  if (!storageManager || typeof storageManager.estimate !== "function") {
    return result({
      supported: false,
      usage_bytes: null,
      quota_bytes: null,
      persisted: null,
      error_code: null,
    });
  }

  const persistence = await readPersisted(storageManager);

  let estimate;
  try {
    estimate = await storageManager.estimate();
  } catch {
    return result({
      supported: true,
      usage_bytes: null,
      quota_bytes: null,
      persisted: persistence.persisted,
      error_code: ESTIMATE_FAILED,
    });
  }

  const usageBytes = finiteNonNegative(estimate?.usage);
  const quotaBytes = finiteNonNegative(estimate?.quota);
  if (usageBytes === null || quotaBytes === null || quotaBytes <= 0) {
    return result({
      supported: true,
      usage_bytes: null,
      quota_bytes: null,
      persisted: persistence.persisted,
      error_code: INVALID_ESTIMATE,
    });
  }

  return result({
    supported: true,
    usage_bytes: usageBytes,
    quota_bytes: quotaBytes,
    persisted: persistence.persisted,
    error_code: persistence.error_code,
  });
}
