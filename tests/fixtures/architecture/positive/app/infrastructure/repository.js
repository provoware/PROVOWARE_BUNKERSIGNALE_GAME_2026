import { identity } from "../domain/model.js";

export function normalizeStoredValue(value) {
  return identity(value);
}
