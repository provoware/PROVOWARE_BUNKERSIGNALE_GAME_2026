export const STORAGE_WARNING_RATIO = 0.75;
export const STORAGE_CRITICAL_RATIO = 0.90;

function persistenceStatus(value, supported) {
  if (!supported) return "unsupported";
  if (value === true) return "persistent";
  if (value === false) return "best_effort";
  return "unknown";
}

export function classifyStorageHealth(sample) {
  const supported = sample?.supported === true;
  const usageBytes = sample?.usage_bytes;
  const quotaBytes = sample?.quota_bytes;
  const persisted = sample?.persisted ?? null;
  const valid = supported
    && Number.isFinite(usageBytes)
    && usageBytes >= 0
    && Number.isFinite(quotaBytes)
    && quotaBytes > 0;

  if (!valid) {
    return Object.freeze({
      capacity_status: "unknown",
      usage_bytes: null,
      quota_bytes: null,
      remaining_bytes: null,
      usage_ratio: null,
      persisted,
      persistence_status: persistenceStatus(persisted, supported),
      error_code: sample?.error_code ?? null,
    });
  }

  const usageRatio = usageBytes / quotaBytes;
  const capacityStatus = usageRatio >= STORAGE_CRITICAL_RATIO
    ? "critical"
    : usageRatio >= STORAGE_WARNING_RATIO
      ? "warning"
      : "normal";

  return Object.freeze({
    capacity_status: capacityStatus,
    usage_bytes: usageBytes,
    quota_bytes: quotaBytes,
    remaining_bytes: Math.max(0, quotaBytes - usageBytes),
    usage_ratio: usageRatio,
    persisted,
    persistence_status: persistenceStatus(persisted, supported),
    error_code: sample?.error_code ?? null,
  });
}
