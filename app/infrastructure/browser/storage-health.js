const ESTIMATE_FAILED = "SSI-STO-1001";
const PERSISTED_FAILED = "SSI-STO-1002";
const INVALID_ESTIMATE = "SSI-STO-1003";

function finiteNonNegative(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function result(values) {
  return Object.freeze(values);
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

  let estimate;
  try {
    estimate = await storageManager.estimate();
  } catch {
    return result({
      supported: true,
      usage_bytes: null,
      quota_bytes: null,
      persisted: null,
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
      persisted: null,
      error_code: INVALID_ESTIMATE,
    });
  }

  let persisted = null;
  let errorCode = null;
  if (typeof storageManager.persisted === "function") {
    try {
      persisted = Boolean(await storageManager.persisted());
    } catch {
      errorCode = PERSISTED_FAILED;
    }
  }

  return result({
    supported: true,
    usage_bytes: usageBytes,
    quota_bytes: quotaBytes,
    persisted,
    error_code: errorCode,
  });
}
