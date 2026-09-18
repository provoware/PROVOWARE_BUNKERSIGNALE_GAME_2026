import { renderValue } from "../ui/view.js";
import { normalizeStoredValue } from "../infrastructure/repository.js";

export function start(value) {
  return renderValue(normalizeStoredValue(value));
}
